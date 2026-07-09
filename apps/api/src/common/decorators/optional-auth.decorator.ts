import { SetMetadata } from '@nestjs/common';

export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth';

/**
 * `@Public()`과 달리, 이 데코레이터가 붙은 라우트는 Access Token 검증을 "시도"는 하되
 * 실패해도(토큰 없음/만료/위조) 요청을 막지 않고 익명으로 통과시킨다. 토큰이 유효하면
 * `request.user`가 정상적으로 채워진다.
 *
 * 용도: 게시글/댓글 목록처럼 비로그인 사용자도 볼 수 있어야 하지만, 로그인한 사용자에게는
 * "차단한 사용자의 글 숨김" 같은 개인화된 필터링을 적용하고 싶은 엔드포인트.
 *
 * @OptionalAuth()
 * @Get('posts')
 * findAll(@CurrentUser() user?: AuthenticatedUser) { ... }
 */
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);
