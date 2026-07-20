import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { RedisConfig } from '../../config/configuration';
import { createBullConnectionOptions } from './bull-connection';
import {
  DEAD_LETTER_QUEUE,
  DEAD_LETTER_QUEUE_NAME,
  DeadLetterJobData,
  MAIL_QUEUE,
  MAIL_QUEUE_NAME,
  MailJobData,
  NOTIFICATION_BROADCAST_QUEUE,
  NOTIFICATION_BROADCAST_QUEUE_NAME,
  NotificationBroadcastJobData,
  RANKING_RECALCULATION_QUEUE,
  RANKING_RECALCULATION_QUEUE_NAME,
} from './queue.constants';
import { AI_SUMMARY_QUEUE, AI_SUMMARY_QUEUE_NAME, AiSummaryJobData } from './ai-summary.constants';
import { MailQueueService } from './mail-queue.service';
import { NotificationBroadcastQueueService } from './notification-broadcast-queue.service';
import { AiSummaryQueueService } from './ai-summary-queue.service';
import { DeadLetterService } from './dead-letter.service';

/**
 * 큐 프로듀서 전용 모듈(@Global). Queue 인스턴스와 얇은 프로듀서 서비스만 제공하며,
 * **Worker(소비자)는 생성하지 않는다** - 실제 소비는 별도 프로세스의 WorkerModule이 담당한다.
 * API 프로세스는 이 모듈만 로드해 작업을 큐에 적재(enqueue)한다.
 */
function queueProvider<T>(token: symbol, name: string) {
  return {
    provide: token,
    inject: [ConfigService],
    useFactory: (configService: ConfigService): Queue<T> => {
      const redisConfig = configService.get<RedisConfig>('queueRedis');
      return new Queue<T>(name, { connection: createBullConnectionOptions(redisConfig) });
    },
  };
}

const QUEUE_PROVIDERS = [
  queueProvider<MailJobData>(MAIL_QUEUE, MAIL_QUEUE_NAME),
  queueProvider<NotificationBroadcastJobData>(NOTIFICATION_BROADCAST_QUEUE, NOTIFICATION_BROADCAST_QUEUE_NAME),
  queueProvider<unknown>(RANKING_RECALCULATION_QUEUE, RANKING_RECALCULATION_QUEUE_NAME),
  queueProvider<AiSummaryJobData>(AI_SUMMARY_QUEUE, AI_SUMMARY_QUEUE_NAME),
  queueProvider<DeadLetterJobData>(DEAD_LETTER_QUEUE, DEAD_LETTER_QUEUE_NAME),
];

@Global()
@Module({
  providers: [
    ...QUEUE_PROVIDERS,
    MailQueueService,
    NotificationBroadcastQueueService,
    AiSummaryQueueService,
    DeadLetterService,
  ],
  exports: [
    MAIL_QUEUE,
    NOTIFICATION_BROADCAST_QUEUE,
    RANKING_RECALCULATION_QUEUE,
    AI_SUMMARY_QUEUE,
    DEAD_LETTER_QUEUE,
    MailQueueService,
    NotificationBroadcastQueueService,
    AiSummaryQueueService,
    DeadLetterService,
  ],
})
export class QueueModule implements OnModuleDestroy {
  constructor(
    @Inject(MAIL_QUEUE) private readonly mailQueue: Queue,
    @Inject(NOTIFICATION_BROADCAST_QUEUE) private readonly notificationQueue: Queue,
    @Inject(RANKING_RECALCULATION_QUEUE) private readonly rankingQueue: Queue,
    @Inject(AI_SUMMARY_QUEUE) private readonly aiSummaryQueue: Queue,
    @Inject(DEAD_LETTER_QUEUE) private readonly deadLetterQueue: Queue,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.mailQueue.close(),
      this.notificationQueue.close(),
      this.rankingQueue.close(),
      this.aiSummaryQueue.close(),
      this.deadLetterQueue.close(),
    ]);
  }
}
