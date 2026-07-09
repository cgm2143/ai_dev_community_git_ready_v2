import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { RedisService } from '../../../infra/redis/redis.service';
import { MailQueueService } from '../../../infra/queue/mail-queue.service';
import { PasswordService } from './password.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppConfig } from '../../../config/configuration';

const RESET_TOKEN_TTL_SECONDS = 60 * 60; // 1시간 - 이메일 인증 링크(24시간)보다 짧게 잡아 탈취 위험을 줄인다
const REDIS_KEY_PREFIX = 'password-reset:';

/**
 * 비밀번호 재설정 토큰도 이메일 인증 토큰과 동일하게 Redis에 저장한다(1회성, TTL 보유).
 * 재설정에 성공하면 보안을 위해 해당 사용자의 모든 Refresh Token(=모든 기기 세션)을 폐기한다 —
 * 비밀번호가 유출되어 재설정한 상황이라면, 공격자가 이미 로그인해 둔 세션도 함께 끊어야 하기 때문이다.
 */
@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mailQueueService: MailQueueService,
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PasswordResetService.name);
  }

  /** 계정 존재 여부를 노출하지 않기 위해 항상 성공 응답으로 이어지도록 컨트롤러에서 호출한다. */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);

    await this.redis.set(`${REDIS_KEY_PREFIX}${tokenHash}`, user.id, RESET_TOKEN_TTL_SECONDS);

    const appConfig = this.configService.get<AppConfig>('app');
    const resetUrl = `${appConfig?.frontendUrl}/reset-password?token=${token}`;

    try {
      await this.mailQueueService.enqueue({
        to: user.email,
        subject: '[devhub] 비밀번호 재설정 안내',
        html: this.buildResetEmailHtml(user.nickname, resetUrl),
      });
    } catch (error) {
      this.logger.error({ err: error, userId: user.id }, '비밀번호 재설정 메일을 큐에 적재하지 못했습니다.');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const key = `${REDIS_KEY_PREFIX}${tokenHash}`;

    const userId = await this.redis.get(key);
    if (!userId) {
      throw new AppException(ErrorCode.PASSWORD_RESET_TOKEN_INVALID);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppException(ErrorCode.PASSWORD_RESET_TOKEN_INVALID);
    }

    const passwordHash = await this.passwordService.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    // 1회성 토큰이므로 사용 즉시 폐기 (재사용 방지)
    await this.redis.delete(key);

    this.logger.info({ userId }, '비밀번호가 재설정되어 모든 세션이 종료되었습니다.');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildResetEmailHtml(nickname: string, resetUrl: string): string {
    return `
      <div style="font-family: sans-serif; line-height: 1.6;">
        <p>${nickname}님, 안녕하세요.</p>
        <p>비밀번호 재설정을 요청하셨습니다. 아래 버튼을 눌러 새 비밀번호를 설정해 주세요. 이 링크는 1시간 동안만 유효합니다.</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#6D5BD0;color:#fff;text-decoration:none;border-radius:6px;">비밀번호 재설정하기</a></p>
        <p>본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.</p>
      </div>
    `;
  }
}
