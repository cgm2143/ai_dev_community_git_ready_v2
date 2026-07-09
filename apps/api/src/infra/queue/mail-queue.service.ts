import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { MAIL_MAX_ATTEMPTS, MAIL_QUEUE, MailJobData } from './queue.constants';

/**
 * 메일 발송 요청을 큐에 적재하기만 하는 얇은 프로듀서.
 * 실제 발송/재시도는 QueueModule이 기동하는 Worker(mail.worker 로직)가 담당한다.
 * 도메인 서비스(EmailVerificationService, PasswordResetService 등)는
 * MailerService를 직접 알 필요 없이 이 서비스만 의존한다.
 */
@Injectable()
export class MailQueueService {
  constructor(@Inject(MAIL_QUEUE) private readonly mailQueue: Queue<MailJobData>) {}

  async enqueue(payload: MailJobData): Promise<void> {
    await this.mailQueue.add('send-mail', payload, {
      attempts: MAIL_MAX_ATTEMPTS,
      backoff: { type: 'custom' },
      removeOnComplete: { count: 1000, age: 24 * 60 * 60 },
      removeOnFail: { count: 1000, age: 7 * 24 * 60 * 60 },
    });
  }
}
