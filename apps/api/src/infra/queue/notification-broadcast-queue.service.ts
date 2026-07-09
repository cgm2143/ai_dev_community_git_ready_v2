import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { NotificationConfig } from '../../config/configuration';
import { NOTIFICATION_BROADCAST_QUEUE, NotificationBroadcastJobData } from './queue.constants';

/**
 * 공지 등 전체 회원 대상 알림 발송의 "첫 배치"를 큐에 적재하기만 하는 얇은 프로듀서.
 * 실제 배치 처리(사용자 조회 -> 대량 insert -> 다음 배치 재적재)는 QueueModule의
 * Worker가 담당한다. 배치 크기는 `NOTIFICATION_BROADCAST_BATCH_SIZE` 환경변수로 조정한다.
 */
@Injectable()
export class NotificationBroadcastQueueService {
  constructor(
    @Inject(NOTIFICATION_BROADCAST_QUEUE) private readonly queue: Queue<NotificationBroadcastJobData>,
    private readonly configService: ConfigService,
  ) {}

  async enqueueFirstBatch(
    params: Omit<NotificationBroadcastJobData, 'batchSize' | 'afterUserId'>,
  ): Promise<void> {
    const notificationConfig = this.configService.get<NotificationConfig>('notification');
    const batchSize = notificationConfig?.broadcastBatchSize ?? 500;

    await this.queue.add(
      'broadcast-batch',
      { ...params, batchSize },
      { removeOnComplete: { count: 500 }, removeOnFail: { count: 500 } },
    );
  }

  /** Worker가 다음 배치를 스스로 재적재할 때 사용한다 (재귀적 팬아웃). */
  async enqueueNextBatch(params: NotificationBroadcastJobData): Promise<void> {
    await this.queue.add('broadcast-batch', params, {
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 500 },
    });
  }
}
