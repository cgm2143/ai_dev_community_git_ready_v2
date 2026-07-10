import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/constants/error-codes';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { EmailVerificationService } from './services/email-verification.service';
import { UserStatus, SocialProvider } from '@prisma/client';

export interface RequestContext {
  userAgent?: string;
  ip?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; nickname: string; role: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async register(dto: RegisterDto) {
    const [existingEmail, existingNickname] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: dto.email } }),
      this.prisma.user.findUnique({ where: { nickname: dto.nickname } }),
    ]);

    if (existingEmail) {
      throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
    }
    if (existingNickname) {
      throw new AppException(ErrorCode.NICKNAME_ALREADY_EXISTS);
    }

    const defaultRole = await this.prisma.role.findUnique({ where: { name: 'USER' } });
    if (!defaultRole) {
      // 시드가 정상적으로 실행되지 않은 환경 문제이므로 사용자에게는 일반화된 서버 오류로 노출한다.
      throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, '기본 권한 설정이 초기화되지 않았습니다.');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        nickname: dto.nickname,
        roleId: defaultRole.id,
      },
    });

    this.logger.info({ userId: user.id }, '신규 회원가입');

    // 회원가입 직후 인증 메일을 발송한다. 메일 전송 자체의 실패는 EmailVerificationService
    // 내부에서 흡수하지만, 쿨다운(RATE_LIMIT_EXCEEDED) 등 서비스 레벨 예외는 여기서 한 번 더
    // 방어적으로 흡수해 회원가입 자체가 실패하지 않도록 한다 (극히 드문 동시 가입 시도 등 예외 상황 대비).
    try {
      await this.emailVerificationService.sendVerificationEmail(user.email);
    } catch (error) {
      this.logger.warn({ err: error, userId: user.id }, '회원가입 직후 인증 메일 발송 요청이 거부되었습니다.');
    }

    return { id: user.id, email: user.email, nickname: user.nickname };
  }

  async login(dto: LoginDto, context: RequestContext): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });

    // 이메일 존재 여부 자체가 노출되지 않도록 사용자 없음과 비밀번호 불일치를 동일한 에러로 응답한다.
    if (!user || !user.passwordHash) {
      throw new AppException(ErrorCode.INVALID_CREDENTIALS);
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppException(ErrorCode.INVALID_CREDENTIALS, '이용이 제한된 계정입니다.');
    }

    const isPasswordValid = await this.passwordService.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppException(ErrorCode.INVALID_CREDENTIALS);
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return this.issueTokenPair(
      { id: user.id, email: user.email, nickname: user.nickname, role: user.role.name },
      context,
    );
  }

  /**
   * Refresh Token Rotation.
   * 1) JWT 서명/만료 검증
   * 2) DB에서 해시로 매칭되는 세션(row) 조회 - 이미 회전되어 사라진 토큰이 재사용되면 "탈취 의심"으로 간주해
   *    해당 사용자의 모든 세션을 폐기한다(Refresh Token Reuse Detection).
   * 3) 정상 세션이면 기존 row를 폐기하고 새 Access/Refresh 토큰 쌍을 발급한다.
   */
  async refresh(rawRefreshToken: string, context: RequestContext): Promise<TokenPair> {
    const payload = await this.verifyRefreshTokenOrThrow(rawRefreshToken);
    const tokenHash = this.tokenService.hashToken(rawRefreshToken);

    const existing = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, tokenHash },
    });

    if (!existing || existing.revokedAt) {
      await this.revokeAllSessions(payload.sub);
      this.logger.warn({ userId: payload.sub }, 'Refresh Token 재사용이 감지되어 모든 세션을 종료했습니다.');
      throw new AppException(
        ErrorCode.INVALID_REFRESH_TOKEN,
        '보안을 위해 모든 기기에서 로그아웃되었습니다. 다시 로그인해 주세요.',
      );
    }

    if (existing.expiresAt < new Date()) {
      throw new AppException(ErrorCode.INVALID_REFRESH_TOKEN);
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, include: { role: true } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(
      { id: user.id, email: user.email, nickname: user.nickname, role: user.role.name },
      context,
    );
  }

  /** 단일 기기 로그아웃 - 해당 Refresh Token 세션만 폐기 */
  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;

    const tokenHash = this.tokenService.hashToken(rawRefreshToken);
    // 이미 만료/폐기된 토큰이어도 에러 없이 조용히 종료한다 (로그아웃은 멱등해야 함)
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** 다중 기기 로그인 관리 - 현재 사용자의 모든 활성 세션을 종료 */
  async logoutAll(userId: string): Promise<void> {
    await this.revokeAllSessions(userId);
  }

  private async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * 소셜 로그인(네이버/카카오/구글) 공통 처리.
   * 1) 이미 이 소셜 계정으로 가입/연동된 이력이 있으면 바로 로그인시킨다.
   * 2) 없고, 제공자가 이메일을 알려줬다면 - 같은 이메일의 기존 계정이 있는지 확인해 자동으로 연동한다.
   *    (네이버/카카오/구글은 이미 이메일 소유권을 검증했으므로, 우리가 다시 이메일 인증을 요구할
   *    필요 없이 안전하게 연동할 수 있다고 판단했다.)
   * 3) 그마저도 없으면 새 계정을 만든다. 이메일이 없는 경우(카카오는 이메일 제공 동의를 안 받을 수
   *    있음) 로그인 식별용 내부 placeholder 이메일을 만들어 둔다(사용자에게 노출되지 않음).
   */
  async loginWithSocialProfile(
    provider: SocialProvider,
    providerUserId: string,
    email: string | undefined,
    nicknameHint: string,
    context: RequestContext,
  ): Promise<TokenPair> {
    const existingLink = await this.prisma.socialAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
      include: { user: { include: { role: true } } },
    });

    if (existingLink) {
      if (existingLink.user.status === UserStatus.WITHDRAWN) {
        await this.prisma.socialAccount.delete({ where: { id: existingLink.id } });
      } else {
        return this.finalizeSocialLogin(existingLink.user, context);
      }
    }

    let user = email
      ? await this.prisma.user.findUnique({ where: { email }, include: { role: true } })
      : null;

    if (!user) {
      const defaultRole = await this.prisma.role.findUnique({ where: { name: 'USER' } });
      if (!defaultRole) {
        throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, '기본 권한 설정이 초기화되지 않았습니다.');
      }

      const nickname = await this.generateUniqueNickname(nicknameHint);
      const placeholderEmail = email ?? `${provider.toLowerCase()}_${providerUserId}@social.local`;

      user = await this.prisma.user.create({
        data: {
          email: placeholderEmail,
          nickname,
          roleId: defaultRole.id,
          emailVerifiedAt: email ? new Date() : null,
        },
        include: { role: true },
      });

      this.logger.info({ userId: user.id, provider }, '소셜 로그인으로 신규 회원가입');
    }

    await this.prisma.socialAccount.create({ data: { userId: user.id, provider, providerUserId } });

    return this.finalizeSocialLogin(user, context);
  }

  private async finalizeSocialLogin(
    user: { id: string; email: string; nickname: string; status: UserStatus; role: { name: string } },
    context: RequestContext,
  ): Promise<TokenPair> {
    if (user.status !== UserStatus.ACTIVE) {
      throw new AppException(ErrorCode.INVALID_CREDENTIALS, '이용이 제한된 계정입니다.');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return this.issueTokenPair(
      { id: user.id, email: user.email, nickname: user.nickname, role: user.role.name },
      context,
    );
  }

  /** 닉네임 힌트(소셜 프로필의 표시 이름 등)를 기반으로, 중복되지 않는 닉네임을 찾아 반환한다. */
  private async generateUniqueNickname(hint: string): Promise<string> {
    const base = hint.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 15) || 'user';
    let candidate = base;
    let suffix = 0;
    // eslint-disable-next-line no-await-in-loop
    while (await this.prisma.user.findUnique({ where: { nickname: candidate } })) {
      suffix += 1;
      candidate = `${base}${suffix}`;
    }
    return candidate;
  }

  private async issueTokenPair(
    user: { id: string; email: string; nickname: string; role: string },
    context: RequestContext,
  ): Promise<TokenPair> {
    const accessToken = await this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const issuedRefreshToken = await this.tokenService.generateRefreshToken(user.id);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.tokenService.hashToken(issuedRefreshToken.token),
        userAgent: context.userAgent,
        ip: context.ip,
        expiresAt: issuedRefreshToken.expiresAt,
      },
    });

    return { accessToken, refreshToken: issuedRefreshToken.token, user };
  }

  private async verifyRefreshTokenOrThrow(rawRefreshToken: string) {
    try {
      return await this.tokenService.verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new AppException(ErrorCode.INVALID_REFRESH_TOKEN);
    }
  }
}
