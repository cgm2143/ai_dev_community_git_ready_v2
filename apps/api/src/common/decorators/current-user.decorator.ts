import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../../modules/auth/types/jwt-payload.interface';

/**
 * @CurrentUser() user: AuthenticatedUser
 * JwtAuthGuard를 통과한 요청의 request.user 를 그대로 꺼내온다.
 * 컨트롤러가 Request 객체 전체에 의존하지 않도록(SRP) 분리한다.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
