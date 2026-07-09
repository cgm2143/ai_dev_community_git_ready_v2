-- 02_fts_setup.sql
-- posts 테이블에 생성 컬럼(generated column) 방식의 tsvector를 추가하고 GIN 인덱스를 부여합니다.
-- Prisma 스키마의 Post 모델에는 이 컬럼을 매핑하지 않고(Prisma가 모르는 컬럼으로 유지),
-- 검색은 반드시 SearchRepository를 통한 raw query로만 접근합니다 (Prisma Client의 일반 CRUD 경로 사용 금지).

-- 한국어 형태소 분석이 필요하므로 운영 환경에서는 mecab_ko 등 한국어 사전이 포함된
-- PostgreSQL 확장(예: pg_bigm, 또는 별도 형태소 분석 전처리 후 저장)을 검토해야 합니다.
-- 아래는 초기 단계에서 영문/숫자/태그 검색까지는 즉시 커버 가능한 simple 설정 기준입니다.

ALTER TABLE posts
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(content, '')), 'B')
  ) STORED;

CREATE INDEX posts_search_vector_idx ON posts USING GIN (search_vector);

-- 조회 예시 (SearchRepository 내부에서 사용할 쿼리)
-- SELECT id, title, ts_rank(search_vector, query) AS rank
-- FROM posts, plainto_tsquery('simple', $1) query
-- WHERE search_vector @@ query AND status = 'PUBLISHED'
-- ORDER BY rank DESC
-- LIMIT $2 OFFSET $3;

-- 한국어 형태소 분석기 도입 시에는 'simple' 대신 커스텀 tsconfig(예: 'korean')로 교체하고
-- 위 GENERATED 컬럼을 마이그레이션으로 재생성해야 합니다 (컬럼 재정의 필요, 무중단 배포 시 2단계 배포 방식 적용).
