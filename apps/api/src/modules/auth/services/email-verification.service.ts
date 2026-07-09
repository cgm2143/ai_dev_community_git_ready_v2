import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { RedisService } from '../../../infra/redis/redis.service';
import { MailQueueService } from '../../../infra/queue/mail-queue.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppConfig } from '../../../config/configuration';

const VERIFICATION_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24시간
const REDIS_KEY_PREFIX = 'email-verify:';
const RESEND_COOLDOWN_PREFIX = 'email-verify-cooldown:';
const RESEND_COOLDOWN_SECONDS = 60; // 동일 이메일 기준 1분에 1회 재발송 제한

/**
 * 이메일 인증 토큰은 1회성/단기(24시간) 데이터이므로 별도 DB 테이블 대신 Redis에 저장한다.
 * (Refresh Token은 감사/재사용 탐지를 위해 DB에 남기지만, 이메일 인증 토큰은 그럴 필요가 없어
 *  TTL이 있는 Redis가 더 적합하다 - 만료되면 자동으로 사라지고 별도 정리(cleanup) 배치가 필요 없다.)
 *
 * 실제 발송은 MailQueueService를 통해 큐에 적재되며, 실패 시 30초/2분/10분 간격으로
 * 최대 3회 자동 재시도된다 (QueueModule의 Worker가 처리).
 */
@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mailQueueService: MailQueueService,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(EmailVerificationService.name);
  }

  /**
   * 이메일 존재 여부가 노출되지 않도록, 쿨다운 체크는 계정 존재 여부와 무관하게
   * 이메일 문자열 자체를 키로 항상 동일하게 적용한다 (존재하는 계정만 429가 뜨는 식의
   * 타이밍/응답 차이를 만들지 않기 위함).
   */
  async sendVerificationEmail(email: string): Promise<void> {
    const cooldownKey = `${RESEND_COOLDOWN_PREFIX}${email}`;
    const remainingSeconds = await this.redis.ttl(cooldownKey);
    if (remainingSeconds > 0) {
      // 프론트엔드가 "n초 후 다시 시도" 카운트다운을 그릴 수 있도록 details에 정확한 남은 시간을 실어 보낸다.
      throw new AppException(
        ErrorCode.RATE_LIMIT_EXCEEDED,
        `인증 메일은 ${remainingSeconds}초 후 다시 발송할 수 있습니다.`,
        { retryAfterSeconds: remainingSeconds },
      );
    }
    await this.redis.set(cooldownKey, '1', RESEND_COOLDOWN_SECONDS);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerifiedAt) {
      return;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);

    await this.redis.set(`${REDIS_KEY_PREFIX}${tokenHash}`, user.id, VERIFICATION_TOKEN_TTL_SECONDS);

    const appConfig = this.configService.get<AppConfig>('app');
    const verifyUrl = `${appConfig?.frontendUrl}/verify-email?token=${token}`;

    try {
      await this.mailQueueService.enqueue({
        to: user.email,
        subject: '[devhub] 이메일 인증을 완료해 주세요',
        html: this.buildVerificationEmailHtml(user.nickname, verifyUrl),
      });
    } catch (error) {
      // 큐 적재 자체가 실패하는 경우(Redis 장애 등)는 Worker의 재시도 대상도 아니므로 여기서 로그만 남긴다.
      this.logger.error({ err: error, userId: user.id }, '인증 메일을 큐에 적재하지 못했습니다.');
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const key = `${REDIS_KEY_PREFIX}${tokenHash}`;

    const userId = await this.redis.get(key);
    if (!userId) {
      throw new AppException(ErrorCode.EMAIL_VERIFICATION_TOKEN_INVALID);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppException(ErrorCode.EMAIL_VERIFICATION_TOKEN_INVALID);
    }
    if (user.emailVerifiedAt) {
      await this.redis.delete(key);
      throw new AppException(ErrorCode.EMAIL_ALREADY_VERIFIED);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });

    // 1회성 토큰이므로 사용 즉시 폐기한다 (재사용 방지)
    await this.redis.delete(key);

    this.logger.info({ userId }, '이메일 인증이 완료되었습니다.');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildVerificationEmailHtml(nickname: string, verifyUrl: string): string {
    return `
      <div style="font-family: sans-serif; line-height: 1.6;">
        <p>${nickname}님, 안녕하세요.</p>
        <p>아래 버튼을 눌러 이메일 인증을 완료해 주세요. 이 링크는 24시간 동안만 유효합니다.</p>
        <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#6D5BD0;color:#fff;text-decoration:none;border-radius:6px;">이메일 인증하기</a></p>
        <p>버튼이 동작하지 않으면 아래 링크를 브라우저에 붙여넣어 주세요.</p>
        <p>${verifyUrl}</p>
      </div>
    `;
  }
}
