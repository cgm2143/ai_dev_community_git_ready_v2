import { SetMetadata } from '@nestjs/common';

export const REQUIRE_EMAIL_VERIFIED_KEY = 'requireEmailVerified';

/**
 * 게시글 작성, 댓글 작성, 추천/비추천, 북마크, 쪽지 등 커뮤니티 활동 엔드포인트에 붙인다.
 * EmailVerifiedGuard가 이 메타데이터를 보고 request.user.emailVerified를 검사한다.
 *
 * @RequireEmailVerified()
 * @Post()
 * createPost() { ... }
 *
 * 실제 사용처(Posts/Comments/Reactions/Bookmarks/Chat 모듈)는 각 도메인 구현 단계에서 추가된다.
 */
export const RequireEmailVerified = () => SetMetadata(REQUIRE_EMAIL_VERIFIED_KEY, true);
