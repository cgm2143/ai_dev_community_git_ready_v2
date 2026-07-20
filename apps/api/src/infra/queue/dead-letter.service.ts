import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import {
  DEAD_LETTER_QUEUE,
  DeadLetterJobData,
  MAIL_QUEUE,
  MAIL_QUEUE_NAME,
  NOTIFICATION_BROADCAST_QUEUE,
  NOTIFICATION_BROADCAST_QUEUE_NAME,
  RANKING_RECALCULATION_QUEUE,
  RANKING_RECALCULATION_QUEUE_NAME,
} from './queue.constants';
import { AI_SUMMARY_QUEUE, AI_SUMMARY_QUEUE_NAME } from './ai-summary.constants';

/**
 * Dead Letter Queue 관리. 모든 재시도를 소진한 Job을 DLQ로 이동시키고(worker에서 호출),
 * 관리자가 원본 큐로 재실행하거나 목록을 조회할 수 있게 한다(UI는 미구현, 구조만 제공).
 */
@Injectable()
export class DeadLetterService {
  private readonly originalQueues: Record<string, Queue>;

  constructor(
    @Inject(DEAD_LETTER_QUEUE) private readonly dlq: Queue<DeadLetterJobData>,
    @Inject(MAIL_QUEUE) mailQueue: Queue,
    @Inject(NOTIFICATION_BROADCAST_QUEUE) notificationQueue: Queue,
    @Inject(RANKING_RECALCULATION_QUEUE) rankingQueue: Queue,
    @Inject(AI_SUMMARY_QUEUE) aiSummaryQueue: Queue,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(DeadLetterService.name);
    this.originalQueues = {
      [MAIL_QUEUE_NAME]: mailQueue,
      [NOTIFICATION_BROADCAST_QUEUE_NAME]: notificationQueue,
      [RANKING_RECALCULATION_QUEUE_NAME]: rankingQueue,
      [AI_SUMMARY_QUEUE_NAME]: aiSummaryQueue,
    };
  }

  /** 최종 실패한 Job을 DLQ에 적재한다. */
  async moveToDeadLetter(entry: DeadLetterJobData): Promise<void> {
    await this.dlq.add('dead-letter', entry, { removeOnComplete: false, removeOnFail: false });
    this.logger.warn(
      { originalQueue: entry.originalQueue, jobName: entry.jobName, attemptsMade: entry.attemptsMade },
      'Job이 최종 실패하여 Dead Letter Queue로 이동했습니다.',
    );
  }

  /** DLQ에 쌓인 항목 목록(관리자 조회용). */
  async listDeadLetters(limit = 100): Promise<Array<{ id: string; data: DeadLetterJobData }>> {
    const jobs = await this.dlq.getJobs(['waiting', 'delayed', 'failed', 'completed'], 0, limit);
    return jobs
      .filter((job) => job?.id)
      .map((job) => ({ id: String(job.id), data: job.data }));
  }

  async countDeadLetters(): Promise<number> {
    return this.dlq.getJobCountByTypes('waiting', 'delayed', 'failed', 'completed');
  }

  /** DLQ 항목을 원본 큐로 재실행하고 DLQ에서 제거한다. */
  async requeue(dlqJobId: string): Promise<boolean> {
    const job = await this.dlq.getJob(dlqJobId);
    if (!job) return false;

    const { originalQueue, jobName, data } = job.data;
    const target = this.originalQueues[originalQueue];
    if (!target) {
      this.logger.error({ originalQueue }, '알 수 없는 원본 큐로 재실행을 시도했습니다.');
      return false;
    }

    await target.add(jobName, data, { attempts: 3, backoff: { type: 'exponential', delay: 5_000 } });
    await job.remove();
    this.logger.info({ originalQueue, jobName }, 'Dead Letter Job을 원본 큐로 재실행했습니다.');
    return true;
  }
}
