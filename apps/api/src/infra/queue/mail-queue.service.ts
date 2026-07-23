import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { MAIL_MAX_ATTEMPTS, MAIL_QUEUE, MailJobData } from './queue.constants';

/**
 * 메일 발송 요청을 큐에 적재하기만 하는 얇은 프로듀서.
 * 실제 발송/재시도는 QueueModule이 기동하는 Worker(mail.worker 로직)가 담당한다.
 * 도메인 서비스(EmailVerificationService, PasswordResetService 등)는
 * MailerService를 직접 알 필요 없이 이 서비스만 의존한다.
 *
 * 큐는 부가 시스템이다(원본 요청 처리와 별개). 큐(Redis) 장애로 적재가 실패하더라도
 * 회원가입/비밀번호 재설정 같은 사용자 요청이 500으로 깨지면 안 되므로, 적재 실패를
 * **여기서 중앙 처리**한다: 예외를 전파하지 않고 로그만 남긴 뒤 성공 여부를 boolean으로 반환한다.
 * (PR #22 RedisService.safe와 동일한 철학 - 부가 시스템 실패는 degrade)
 *
 * 정책 결정은 호출부의 몫이다: 반환값을 무시하면 best-effort(요청은 정상 처리),
 * 반환값이 false일 때 요청을 실패시켜야 하는 흐름은 호출부에서 그 정책을 적용한다.
 * 큐 적재에 성공한 뒤의 발송 재시도/백오프/DLQ 정책은 종전 그대로 유지된다.
 */
@Injectable()
export class MailQueueService {
  private readonly logger = new Logger(MailQueueService.name);

  constructor(@Inject(MAIL_QUEUE) private readonly mailQueue: Queue<MailJobData>) {}

  /** 메일 작업을 큐에 적재한다. 적재 성공 시 true, 큐 장애 등으로 실패 시 false(예외를 던지지 않음). */
  async enqueue(payload: MailJobData): Promise<boolean> {
    try {
      await this.mailQueue.add('send-mail', payload, {
        attempts: MAIL_MAX_ATTEMPTS,
        backoff: { type: 'custom' },
        removeOnComplete: { count: 1000, age: 24 * 60 * 60 },
        removeOnFail: { count: 1000, age: 7 * 24 * 60 * 60 },
      });
      return true;
    } catch (error) {
      this.logger.error(`메일 큐 적재 실패 - 발송이 누락됩니다(요청 처리에는 영향 없음): ${String(error)}`);
      return false;
    }
  }
}
