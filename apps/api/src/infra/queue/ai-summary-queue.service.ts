import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AI_SUMMARY_QUEUE, AI_SUMMARY_JOB_NAME, AiSummaryJobData } from './ai-summary.constants';

/**
 * AI 요약 생성 작업을 큐에 적재한다. jobId를 postId 기준으로 고정해, 같은 글에 대해 요약이 없을 때
 * 여러 사용자가 동시에 상세 페이지에 진입하더라도 작업이 한 번만 등록되도록 한다(BullMQ 중복 방지).
 */
@Injectable()
export class AiSummaryQueueService {
  constructor(@Inject(AI_SUMMARY_QUEUE) private readonly queue: Queue<AiSummaryJobData>) {}

  async enqueue(postId: string): Promise<void> {
    await this.queue.add(
      AI_SUMMARY_JOB_NAME,
      { postId },
      {
        jobId: `ai-summary:${postId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
  }
}
