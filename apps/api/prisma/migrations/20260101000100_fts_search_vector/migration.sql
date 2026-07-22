-- 전문검색(Full Text Search) 설정: posts.search_vector(생성 컬럼) + GIN 인덱스.
-- Prisma 스키마에는 이 컬럼을 매핑하지 않으며(SearchRepository의 raw query로만 접근),
-- 검색(searchByKeyword/자동완성)이 운영에서 항상 동작하도록 이 마이그레이션으로 생성한다.
--
-- IF NOT EXISTS로 멱등하게 작성한다: db push로 만들어진 기존 운영 DB에 search_vector가
-- 이미 있든 없든 안전하게 적용되며, 여러 번 실행해도 문제없다.

ALTER TABLE "posts"
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("content", '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS "posts_search_vector_idx" ON "posts" USING GIN ("search_vector");
