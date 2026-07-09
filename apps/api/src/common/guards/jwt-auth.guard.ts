import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IS_OPTIONAL_AUTH_KEY } from '../decorators/optional-auth.decorator';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../constants/error-codes';

interface RequestWithOptionalAuthFlag {
  __optionalAuth?: boolean;
}

/**
 * 전역 Guard(APP_GUARD)로 등록되어 모든 라우트를 기본적으로 보호한다.
 * - @Public() 이 붙은 라우트: 인증 자체를 건너뛴다 (request.user는 항상 undefined).
 * - @OptionalAuth() 이 붙은 라우트: Passport 검증은 실행하되, 실패해도 막지 않고
 *   익명으로 통과시킨다 (토큰이 유효하면 request.user가 채워짐).
 * - 그 외: 기존과 동일하게 인증 필수.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const isOptionalAuth = this.reflector.getAllAndOverride<boolean>(IS_OPTIONAL_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isOptionalAuth) {
      const request = context.switchToHttp().getRequest<RequestWithOptionalAuthFlag>();
      request.__optionalAuth = true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    const request = context.switchToHttp().getRequest<RequestWithOptionalAuthFlag>();

    if (request.__optionalAuth) {
      // 토큰이 없거나 유효하지 않아도 예외를 던지지 않고 익명(undefined)으로 통과시킨다.
      return (user ?? undefined) as TUser;
    }

    if (err || !user) {
      throw new AppException(ErrorCode.UNAUTHORIZED);
    }
    return user;
  }
}
