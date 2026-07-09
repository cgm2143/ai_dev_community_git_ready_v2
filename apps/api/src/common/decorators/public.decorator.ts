import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 전역 JwtAuthGuard 적용 정책 하에서, 인증이 필요 없는 라우트에 붙인다.
 * 예: 회원가입, 로그인, 공개 게시글 조회 등
 *
 * @Public()
 * @Get('posts')
 * findAll() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
