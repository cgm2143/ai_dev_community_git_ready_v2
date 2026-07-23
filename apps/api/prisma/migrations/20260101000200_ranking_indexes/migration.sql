-- 랭킹 정렬용 인덱스: posts의 count 컬럼(like/view/comment) 내림차순 정렬을 지원한다.
-- findRanking(type=views/comments/likes)와 findAll(sort=popular)는
--   WHERE status='PUBLISHED' AND deleted_at IS NULL  ORDER BY <count> DESC, created_at DESC
-- 형태라, (status, <count>) 복합 인덱스로 "status 필터 후 count 순 정렬"을 인덱스가 처리해
-- 매칭 집합 전체를 읽어 Sort 하던 Seq/Bitmap Scan + Sort 비용을 제거한다.
-- (HOT 랭킹은 Redis ZSET 정렬이라 이 인덱스와 무관하다.)
--
-- FTS 마이그레이션과 동일하게 IF NOT EXISTS로 멱등하게 작성한다: db push로 만들어진 기존 운영 DB에
-- 인덱스가 이미 있든 없든 안전하게 적용되며, 여러 번 실행해도 문제없다.
-- 인덱스명/컬럼은 Prisma의 @@index([status, likeCount]) 등이 생성하는 이름과 일치시켜 drift를 방지한다.

CREATE INDEX IF NOT EXISTS "posts_status_like_count_idx" ON "posts"("status", "like_count");
CREATE INDEX IF NOT EXISTS "posts_status_view_count_idx" ON "posts"("status", "view_count");
CREATE INDEX IF NOT EXISTS "posts_status_comment_count_idx" ON "posts"("status", "comment_count");
