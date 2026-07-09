import { Global, Inject, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { UserStatus, NotificationType } from '@prisma/client';
import { RedisConfig } from '../../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { MailerModule } from '../mailer/mailer.module';
import { MailerService } from '../mailer/mailer.service';
import {
  MAIL_QUEUE,
  MAIL_QUEUE_NAME,
  MAIL_RETRY_DELAYS_MS,
  MailJobData,
  NOTIFICATION_BROADCAST_QUEUE,
  NOTIFICATION_BROADCAST_QUEUE_NAME,
  NotificationBroadcastJobData,
  RANKING_RECALCULATION_QUEUE,
  RANKING_RECALCULATION_QUEUE_NAME,
  RANKING_RECALCULATION_JOB_NAME,
  RANKING_RECALCULATION_INTERVAL_MS,
} from './queue.constants';
import { MailQueueService } from './mail-queue.service';
import { NotificationBroadcastQueueService } from './notification-broadcast-queue.service';
import { computeNotificationGroupKey } from '../../modules/notifications/notification-group-key.util';
import { RankingModule } from '../../modules/ranking/ranking.module';
import { RankingService } from '../../modules/ranking/ranking.service';

/**
 * BullMQ는 내부적으로 자체 ioredis 버전을 번들링하므로, 프로젝트의 최상위 ioredis로 만든
 * Redis 인스턴스를 그대로 넘기면 타입이 어긋난다(런타임은 호환되지만 컴파일 타임에 충돌).
 * 따라서 인스턴스 대신 순수 연결 옵션 객체를 전달해 BullMQ가 내부적으로 커넥션을 생성하게 한다.
 * `maxRetriesPerRequest: null`은 BullMQ Worker의 블로킹 커맨드 사용을 위한 필수 설정이다.
 */
function createBullConnectionOptions(redisConfig: RedisConfig | undefined): ConnectionOptions {
  return {
    host: redisConfig?.host,
    port: redisConfig?.port,
    password: redisConfig?.password,
    maxRetriesPerRequest: null,
  };
}

const mailQueueProvider = {
  provide: MAIL_QUEUE,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Queue<MailJobData> => {
    const redisConfig = configService.get<RedisConfig>('queueRedis');
    return new Queue<MailJobData>(MAIL_QUEUE_NAME, {
      connection: createBullConnectionOptions(redisConfig),
    });
  },
};

const notificationBroadcastQueueProvider = {
  provide: NOTIFICATION_BROADCAST_QUEUE,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Queue<NotificationBroadcastJobData> => {
    const redisConfig = configService.get<RedisConfig>('queueRedis');
    return new Queue<NotificationBroadcastJobData>(NOTIFICATION_BROADCAST_QUEUE_NAME, {
      connection: createBullConnectionOptions(redisConfig),
    });
  },
};

const rankingRecalculationQueueProvider = {
  provide: RANKING_RECALCULATION_QUEUE,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Queue => {
    const redisConfig = configService.get<RedisConfig>('queueRedis');
    return new Queue(RANKING_RECALCULATION_QUEUE_NAME, {
      connection: createBullConnectionOptions(redisConfig),
    });
  },
};

/**
 * 메일 발송 Worker, 공지(NOTICE) 알림 대량 발송 Worker, 인기글 랭킹 전체 재검증 Worker를
 * 함께 기동/종료한다.
 *
 * - 메일: 재시도 지연시간 30초 -> 2분 -> 10분 커스텀 백오프.
 * - 알림 대량 발송: API 응답과 완전히 분리된 비동기 배치 처리, 재귀적 팬아웃.
 * - 랭킹 재검증(12단계): `RankingService.applyEngagementDelta()`의 증분 갱신만으로는
 *   시간 경과에 따른 점수 감쇠 오차가 누적되므로, 5분마다 BullMQ의 **반복 작업(repeatable job)**으로
 *   `RankingService.recalculateAll()`을 호출해 전체를 검증/보정한다. `@nestjs/schedule`의
 *   인프로세스 `@Cron` 대신 BullMQ를 쓰는 이유: 재시도/실패 로그/작업 이력이 큐에 남고,
 *   여러 인스턴스가 떠 있어도 BullMQ가 중복 실행 없이 정확히 한 번만 처리하도록 보장하기 때문이다.
 */
@Global()
@Module({
  imports: [MailerModule, RankingModule],
  providers: [
    mailQueueProvider,
    notificationBroadcastQueueProvider,
    rankingRecalculationQueueProvider,
    MailQueueService,
    NotificationBroadcastQueueService,
  ],
  exports: [MailQueueService, NotificationBroadcastQueueService],
})
export class QueueModule implements OnModuleInit, OnModuleDestroy {
  private mailWorker!: Worker<MailJobData>;
  private notificationBroadcastWorker!: Worker<NotificationBroadcastJobData>;
  private rankingRecalculationWorker!: Worker;

  constructor(
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
    private readonly prisma: PrismaService,
    private readonly notificationBroadcastQueueService: NotificationBroadcastQueueService,
    private readonly rankingService: RankingService,
    @Inject(RANKING_RECALCULATION_QUEUE) private readonly rankingRecalculationQueue: Queue,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(QueueModule.name);
  }

  async onModuleInit(): Promise<void> {
    this.mailWorker = this.createMailWorker();
    this.notificationBroadcastWorker = this.createNotificationBroadcastWorker();
    this.rankingRecalculationWorker = this.createRankingRecalculationWorker();
    await this.scheduleRankingRecalculation();
  }

  private createMailWorker(): Worker<MailJobData> {
    const redisConfig = this.configService.get<RedisConfig>('queueRedis');

    const worker = new Worker<MailJobData>(
      MAIL_QUEUE_NAME,
      async (job) => {
        await this.mailerService.send(job.data);
      },
      {
        connection: createBullConnectionOptions(redisConfig),
        settings: {
          backoffStrategy: (attemptsMade: number) =>
            MAIL_RETRY_DELAYS_MS[attemptsMade - 1] ?? MAIL_RETRY_DELAYS_MS[MAIL_RETRY_DELAYS_MS.length - 1],
        },
      },
    );

    worker.on('failed', (job, err) => {
      this.logger.error(
        { err, jobId: job?.id, attemptsMade: job?.attemptsMade, to: job?.data.to },
        '메일 발송이 모든 재시도(30초/2분/10분) 후에도 실패했습니다. 사용자의 재발송이 필요합니다.',
      );
    });

    return worker;
  }

  private createNotificationBroadcastWorker(): Worker<NotificationBroadcastJobData> {
    const redisConfig = this.configService.get<RedisConfig>('queueRedis');

    const worker = new Worker<NotificationBroadcastJobData>(
      NOTIFICATION_BROADCAST_QUEUE_NAME,
      async (job) => this.processBroadcastBatch(job.data),
      { connection: createBullConnectionOptions(redisConfig) },
    );

    worker.on('failed', (job, err) => {
      this.logger.error(
        { err, jobId: job?.id, afterUserId: job?.data.afterUserId },
        '공지 알림 배치 처리 중 오류가 발생했습니다.',
      );
    });

    return worker;
  }

  private createRankingRecalculationWorker(): Worker {
    const redisConfig = this.configService.get<RedisConfig>('queueRedis');

    const worker = new Worker(
      RANKING_RECALCULATION_QUEUE_NAME,
      async () => this.rankingService.recalculateAll(),
      { connection: createBullConnectionOptions(redisConfig) },
    );

    worker.on('failed', (job, err) => {
      this.logger.error({ err, jobId: job?.id }, '인기글 랭킹 전체 재검증 작업이 실패했습니다.');
    });

    return worker;
  }

  /**
   * BullMQ의 repeat 옵션으로 반복 작업을 등록한다. jobId를 고정값으로 지정해,
   * 앱이 재시작되거나 여러 인스턴스가 동시에 뜨더라도 동일한 반복 작업이 중복 등록되지 않는다
   * (BullMQ가 동일 반복 작업 키를 인식해 덮어쓴다).
   */
  private async scheduleRankingRecalculation(): Promise<void> {
    await this.rankingRecalculationQueue.add(
      RANKING_RECALCULATION_JOB_NAME,
      {},
      {
        repeat: { every: RANKING_RECALCULATION_INTERVAL_MS },
        jobId: 'ranking-recalculation-repeatable',
      },
    );
  }

  private async processBroadcastBatch(data: NotificationBroadcastJobData): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        ...(data.afterUserId ? { id: { gt: data.afterUserId } } : {}),
        ...(data.actorId ? { id: { not: data.actorId } } : {}),
      },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: data.batchSize,
    });

    if (users.length === 0) {
      this.logger.info({ type: data.type }, '공지 알림 전체 발송이 완료되었습니다.');
      return;
    }

    const groupKey = computeNotificationGroupKey(data.type, data.targetType, data.targetId);

    await this.prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type: data.type as NotificationType,
        actorId: data.actorId,
        targetType: data.targetType,
        targetId: data.targetId,
        message: data.message,
        groupKey,
      })),
    });

    const lastUserId = users[users.length - 1].id;
    await this.notificationBroadcastQueueService.enqueueNextBatch({ ...data, afterUserId: lastUserId });
  }

  async onModuleDestroy(): Promise<void> {
    await this.mailWorker.close();
    await this.notificationBroadcastWorker.close();
    await this.rankingRecalculationWorker.close();
  }
}
