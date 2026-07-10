import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { SocialProvider } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/constants/error-codes';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendVerificationEmailDto, VerifyEmailDto } from './dto/email-verification.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { AccessTokenResponseDto } from './dto/auth-response.dto';
import { AuthenticatedUser } from './types/jwt-payload.interface';
import { REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE_PATH } from './auth.constants';
import { AppConfig } from '../../config/configuration';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordResetService } from './services/password-reset.service';
import { createSocialConfigGuard } from './guards/social-config.guard';
import type { SocialProfile } from './strategies/naver.strategy';

/**
 * 이 컨트롤러의 엔드포인트별 Rate Limit은 전역 기본값(1분 100회, app.module.ts)보다
 * 훨씬 엄격하게 재정의한다. 브루트포스/계정 대량 생성/메일 폭탄 등 어뷰징에
 * 특히 취약한 인증 관련 엔드포인트이기 때문이다. 숫자는 운영 데이터가 쌓이면 조정 가능하다.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordResetService: PasswordResetService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 10 * 60 * 1000 } }) // IP당 10분에 5회 - 대량 계정 생성 방지
  @Post('register')
  @ApiOperation({ summary: '회원가입' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 5 * 60 * 1000 } }) // IP당 5분에 10회 - 로그인 브루트포스 방지
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({ status: 200, type: AccessTokenResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponseDto> {
    const result = await this.authService.login(dto, this.extractContext(req));
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60 * 1000 } }) // IP당 1분에 20회 - 정상적인 무음 재발급을 방해하지 않는 선에서 제한
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access Token 재발급 (Refresh Token Rotation)' })
  @ApiResponse({ status: 200, type: AccessTokenResponseDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponseDto> {
    const rawRefreshToken = this.extractRefreshTokenOrThrow(req);
    const result = await this.authService.refresh(rawRefreshToken, this.extractContext(req));
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // IP당 1시간 5회 (동일 이메일 1분 1회 제한은 서비스 레이어에서 별도 적용)
  @Post('email/send-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '이메일 인증 메일 발송(재발송 포함, 동일 이메일 기준 1분 1회 제한)' })
  async sendVerificationEmail(@Body() dto: SendVerificationEmailDto): Promise<void> {
    await this.emailVerificationService.sendVerificationEmail(dto.email);
  }

  @Public()
  @Post('email/verify')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '이메일 인증 확인' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    await this.emailVerificationService.verifyEmail(dto.token);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // IP당 1시간 5회 - 메일 폭탄/계정 존재 여부 스캐닝 방지
  @Post('password/forgot')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '비밀번호 찾기 - 재설정 메일 발송' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.passwordResetService.requestPasswordReset(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60 * 60 * 1000 } }) // IP당 1시간 10회 - 토큰 무차별 대입 방지
  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '비밀번호 재설정 (토큰은 1회성, 성공 시 모든 세션 종료)' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.passwordResetService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '로그아웃 (현재 기기 세션 종료)' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    await this.authService.logout(rawRefreshToken);
    this.clearRefreshCookie(res);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '모든 기기에서 로그아웃 (다중 기기 세션 전체 종료)' })
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logoutAll(user.id);
    this.clearRefreshCookie(res);
  }

  // ── 소셜 로그인 ──────────────────────────────────────────────────────────
  // 흐름: (1) /auth/naver 접속 -> Passport가 네이버 인증 페이지로 리다이렉트
  //       (2) 사용자가 네이버에서 로그인/동의 -> 네이버가 /auth/naver/callback으로 리다이렉트
  //       (3) 콜백에서 우리 회원 계정을 찾거나 새로 만들고, 일반 로그인과 동일하게
  //           Refresh Token을 HttpOnly 쿠키로 굽고 프론트엔드로 리다이렉트한다.
  //       (4) Access Token은 URL에 담지 않는다 - 프론트엔드의 콜백 페이지가
  //           /auth/refresh를 한 번 호출해 방금 구운 쿠키로 Access Token을 받아간다
  //           (기존 로그인 흐름과 완전히 동일한 방식이라 프론트엔드 코드 재사용이 쉽다).
  @Public()
  @UseGuards(createSocialConfigGuard('naver'), AuthGuard('naver'))
  @Get('naver')
  @ApiOperation({ summary: '네이버 로그인 시작 (네이버 인증 페이지로 리다이렉트)' })
  async naverLogin(): Promise<void> {
    // Passport가 리다이렉트를 처리하므로 본문은 비어 있다.
  }

  @Public()
  @UseGuards(createSocialConfigGuard('naver'), AuthGuard('naver'))
  @Get('naver/callback')
  @ApiOperation({ summary: '네이버 로그인 콜백' })
  async naverCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.handleSocialCallback(SocialProvider.NAVER, req, res);
  }

  @Public()
  @UseGuards(createSocialConfigGuard('kakao'), AuthGuard('kakao'))
  @Get('kakao')
  @ApiOperation({ summary: '카카오 로그인 시작 (카카오 인증 페이지로 리다이렉트)' })
  async kakaoLogin(): Promise<void> {}

  @Public()
  @UseGuards(createSocialConfigGuard('kakao'), AuthGuard('kakao'))
  @Get('kakao/callback')
  @ApiOperation({ summary: '카카오 로그인 콜백' })
  async kakaoCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.handleSocialCallback(SocialProvider.KAKAO, req, res);
  }

  @Public()
  @UseGuards(createSocialConfigGuard('google'), AuthGuard('google'))
  @Get('google')
  @ApiOperation({ summary: '구글 로그인 시작 (구글 인증 페이지로 리다이렉트)' })
  async googleLogin(): Promise<void> {}

  @Public()
  @UseGuards(createSocialConfigGuard('google'), AuthGuard('google'))
  @Get('google/callback')
  @ApiOperation({ summary: '구글 로그인 콜백' })
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.handleSocialCallback(SocialProvider.GOOGLE, req, res);
  }

  private async handleSocialCallback(provider: SocialProvider, req: Request, res: Response): Promise<void> {
    const profile = req.user as SocialProfile;
    const appConfig = this.configService.get<AppConfig>('app');

    try {
      const tokens = await this.authService.loginWithSocialProfile(
        provider,
        profile.providerUserId,
        profile.email,
        profile.nicknameHint,
        this.extractContext(req),
      );
      this.setRefreshCookie(res, tokens.refreshToken);
      res.redirect(`${appConfig?.frontendUrl}/auth/callback`);
    } catch {
      // 실패 원인(정지된 계정 등)을 URL에 그대로 노출하지 않고, 프론트엔드가 안내 문구를
      // 보여줄 수 있도록 에러 표시만 붙여 리다이렉트한다.
      res.redirect(`${appConfig?.frontendUrl}/auth/callback?error=1`);
    }
  }

  private extractContext(req: Request) {
    return {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    };
  }

  private extractRefreshTokenOrThrow(req: Request): string {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    if (!token) {
      throw new AppException(ErrorCode.UNAUTHORIZED, 'Refresh Token이 없습니다.');
    }
    return token;
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    const appConfig = this.configService.get<AppConfig>('app');
    const isProduction = appConfig?.nodeEnv === 'production';
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      // 운영 환경에서는 프론트엔드(Vercel)와 백엔드(Railway)가 서로 다른 도메인이므로
      // sameSite:'strict'로는 쿠키가 아예 전송되지 않는다(브라우저가 크로스 사이트 요청에서
      // strict 쿠키를 차단함). 크로스 도메인 배포를 지원하려면 'none' + secure(HTTPS 필수)가
      // 맞다. 로컬 개발(같은 사이트, http)에서는 'lax'로도 충분하고 secure를 강제하지 않는다.
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: REFRESH_TOKEN_COOKIE_PATH,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: REFRESH_TOKEN_COOKIE_PATH });
  }
}
