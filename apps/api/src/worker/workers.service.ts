import * as os from 'node:os';
import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { Job, Queue, Worker } from 'bullmq';
import { NotificationType, UserStatus } from '@prisma/client';
import { RedisConfig } from '../config/configuration';
import { PrismaService } from '../infra/prisma/prisma.service';
import { MailerService } from '../infra/mailer/mailer.service';
import { RankingService } from '../modules/ranking/ranking.service';
import { AiAnalysisService } from '../modules/ai/ai-analysis.service';
import { computeNotificationGroupKey } from '../modules/notifications/notification-group-key.util';
import { createBullConnectionOptions } from '../infra/queue/bull-connection';
import { DeadLetterService } from '../infra/queue/dead-letter.service';
import { NotificationBroadcastQueueService } from '../infra/queue/notification-broadcast-queue.service';
import {
  MAIL_QUEUE_NAME,
  MAIL_RETRY_DELAYS_MS,
  MailJobData,
  NOTIFICATION_BROADCAST_QUEUE_NAME,
  NotificationBroadcastJobData,
  RANKING_RECALCULATION_QUEUE,
  RANKING_RECALCULATION_QUEUE_NAME,
  RANKING_RECALCULATION_JOB_NAME,
  RANKING_RECALCULATION_INTERVAL_MS,
} from '../infra/queue/queue.constants';
import { AI_SUMMARY_QUEUE_NAME, AiSummaryJobData } from '../infra/queue/ai-summary.constants';

const HEALTH_LOG_INTERVAL_MS = 60_000;

/**
 * 모든 BullMQ Worker(소비자)를 소유·기동·종료하는 서비스. **Worker 프로세스에서만** 로드된다.
 * 안정성: 시작/Ready/실패/에러/헬스 로그, Graceful Shutdown, 최종 실패 시 Dead Letter Queue 이동.
 */
@Injectable()
export class WorkersService implements OnModuleInit, OnModuleDestroy {
  private readonly workerId = `${os.hostname()}#${process.pid}`;
  private readonly workers: Worker[] = [];
  private healthTimer?: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
    private readonly mailerService: MailerService,
    private readonly prisma: PrismaService,
    private readonly rankingService: RankingService,
    private readonly aiAnalysisService: AiAnalysisService,
    private readonly notificationBroadcastQueueService: NotificationBroadcastQueueService,
    private readonly deadLetterService: DeadLetterService,
    @Inject(RANKING_RECALCULATION_QUEUE) private readonly rankingQueue: Queue,
  ) {
    this.logger.setContext(WorkersService.name);
  }

  async onModuleInit(): Promise<void> {
    const queueNames = [
      MAIL_QUEUE_NAME,
      NOTIFICATION_BROADCAST_QUEUE_NAME,
      RANKING_RECALCULATION_QUEUE_NAME,
      AI_SUMMARY_QUEUE_NAME,
    ];
    this.logger.info({ workerId: this.workerId, queues: queueNames }, '[Worker] 프로세스를 시작합니다.');

    this.workers.push(this.createMailWorker());
    this.workers.push(this.createNotificationBroadcastWorker());
    this.workers.push(this.createRankingWorker());
    this.workers.push(this.createAiSummaryWorker());
    await this.scheduleRankingRecalculation();

    this.healthTimer = setInterval(() => {
      this.logger.info({ workerId: this.workerId, workers: this.workers.length }, '[Worker] health OK');
    }, HEALTH_LOG_INTERVAL_MS);
    this.healthTimer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.healthTimer) clearInterval(this.healthTimer);
    this.logger.info({ workerId: this.workerId }, '[Worker] Graceful shutdown - 진행 중인 작업을 마치고 종료합니다.');
    await Promise.all(this.workers.map((worker) => worker.close()));
    this.logger.info({ workerId: this.workerId }, '[Worker] 종료 완료.');
  }

  /** 공통 이벤트 로깅 + 최종 실패 시 DLQ 이동을 부착한다. */
  private attach(worker: Worker, queueName: string): Worker {
    worker.on('ready', () => this.logger.info({ workerId: this.workerId, queueName }, '[Worker] ready'));
    worker.on('error', (err) =>
      this.logger.error({ workerId: this.workerId, queueName, err }, '[Worker] queue error'),
    );
    worker.on('failed', (job: Job | undefined, err: Error) => {
      void this.handleFailed(queueName, job, err);
    });
    return worker;
  }

  private async handleFailed(queueName: string, job: Job | undefined, err: Error): Promise<void> {
    const attemptsMade = job?.attemptsMade ?? 0;
    const maxAttempts = job?.opts.attempts ?? 1;
    this.logger.warn(
      {
        workerId: this.workerId,
        queueName,
        jobId: job?.id,
        correlationId: job?.id,
        attemptsMade,
        maxAttempts,
        error: err.message,
      },
      '[Worker] job failed',
    );

    if (job && attemptsMade >= maxAttempts) {
      await this.deadLetterService
        .moveToDeadLetter({
          originalQueue: queueName,
          jobName: job.name,
          data: job.data,
          failedReason: err.message.slice(0, 500),
          attemptsMade,
          failedAt: new Date().toISOString(),
        })
        .catch((e) => this.logger.error({ e, queueName }, '[Worker] DLQ 이동 실패'));
    }
  }

  private connection() {
    return createBullConnectionOptions(this.configService.get<RedisConfig>('queueRedis'));
  }

  private createMailWorker(): Worker<MailJobData> {
    const worker = new Worker<MailJobData>(MAIL_QUEUE_NAME, async (job) => this.mailerService.send(job.data), {
      connection: this.connection(),
      settings: {
        backoffStrategy: (attemptsMade: number) =>
          MAIL_RETRY_DELAYS_MS[attemptsMade - 1] ?? MAIL_RETRY_DELAYS_MS[MAIL_RETRY_DELAYS_MS.length - 1],
      },
    });
    return this.attach(worker, MAIL_QUEUE_NAME);
  }

  private createNotificationBroadcastWorker(): Worker<NotificationBroadcastJobData> {
    const worker = new Worker<NotificationBroadcastJobData>(
      NOTIFICATION_BROADCAST_QUEUE_NAME,
      async (job) => this.processBroadcastBatch(job.data),
      { connection: this.connection() },
    );
    return this.attach(worker, NOTIFICATION_BROADCAST_QUEUE_NAME);
  }

  private createRankingWorker(): Worker {
    const worker = new Worker(RANKING_RECALCULATION_QUEUE_NAME, async () => this.rankingService.recalculateAll(), {
      connection: this.connection(),
    });
    return this.attach(worker, RANKING_RECALCULATION_QUEUE_NAME);
  }

  private createAiSummaryWorker(): Worker<AiSummaryJobData> {
    const worker = new Worker<AiSummaryJobData>(
      AI_SUMMARY_QUEUE_NAME,
      async (job) => this.aiAnalysisService.generateSummaryForPost(job.data.postId),
      { connection: this.connection() },
    );
    return this.attach(worker, AI_SUMMARY_QUEUE_NAME);
  }

  private async scheduleRankingRecalculation(): Promise<void> {
    await this.rankingQueue.add(
      RANKING_RECALCULATION_JOB_NAME,
      {},
      { repeat: { every: RANKING_RECALCULATION_INTERVAL_MS }, jobId: 'ranking-recalculation-repeatable' },
    );
  }

  /** 공지 알림 대량 발송: 커서 기반 배치 처리 후 다음 배치를 스스로 재적재(재귀적 팬아웃). */
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
      this.logger.info({ workerId: this.workerId, type: data.type }, '공지 알림 전체 발송이 완료되었습니다.');
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
}
