import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_EMAIL_VERIFIED_KEY } from '../decorators/require-email-verified.decorator';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../constants/error-codes';
import { AuthenticatedUser } from '../../modules/auth/types/jwt-payload.interface';

/**
 * 로그인은 허용하되, @RequireEmailVerified()가 붙은 라우트는 이메일 인증을 완료한
 * 사용자만 통과시킨다. JwtAuthGuard가 먼저 실행되어 request.user가 채워진 상태를 전제로 한다.
 *
 * 정책(사용자 확정): 이메일 미인증 사용자도 로그인은 가능하지만, 게시글/댓글 작성,
 * 추천/비추천, 북마크, 쪽지 등 커뮤니티 활동은 인증 완료 전까지 제한한다.
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiresVerification = this.reflector.getAllAndOverride<boolean | undefined>(
      REQUIRE_EMAIL_VERIFIED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiresVerification) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!request.user?.emailVerified) {
      throw new AppException(ErrorCode.EMAIL_NOT_VERIFIED);
    }

    return true;
  }
}
