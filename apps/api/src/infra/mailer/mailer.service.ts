import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import * as nodemailer from 'nodemailer';
import { MailConfig } from '../../config/configuration';
import { MAIL_TRANSPORTER } from './mailer.constants';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * 실제 발송 채널(nodemailer/SMTP)을 감싼다.
 * 도메인 서비스(EmailVerificationService 등)는 이 서비스만 의존하므로,
 * 추후 이메일 발송을 BullMQ 큐 뒤로 옮기더라도(1단계 아키텍처에서 계획한 비동기 발송)
 * MailerService의 시그니처(send)는 그대로 유지한 채 내부 구현만 큐 프로듀서로 교체하면 된다.
 */
@Injectable()
export class MailerService {
  private readonly fromAddress: string;

  constructor(
    @Inject(MAIL_TRANSPORTER) private readonly transporter: nodemailer.Transporter,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(MailerService.name);
    const mailConfig = this.configService.get<MailConfig>('mail');
    this.fromAddress = mailConfig?.from ?? 'devhub <no-reply@devhub.example.com>';
  }

  async send(options: SendMailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
    } catch (error) {
      // 실패 사실은 로그로 남기고, 실패 시 트랜잭션을 계속 진행할지 여부는 호출부(EmailVerificationService 등)의
      // 정책에 맡기기 위해 에러를 그대로 다시 던진다.
      this.logger.error({ err: error, to: options.to }, '메일 발송에 실패했습니다.');
      throw error;
    }
  }
}
