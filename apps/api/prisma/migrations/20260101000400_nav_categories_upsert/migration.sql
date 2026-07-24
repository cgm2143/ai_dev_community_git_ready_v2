-- 상단 GNB 카테고리 + 기본 게시판 UPSERT (운영 slug 불일치 교정 · 게시판까지 보장).
--
-- 배경: 20260101000300 은 UPDATE-only 라, 운영 DB의 실제 slug(dev/ops/ai/community …)와 다른
-- 대상 slug(game/money/work/car/travel/food/health/market …)에 대해 0건 갱신되어 카테고리가 생기지 않았다.
-- 여기서는 INSERT ... ON CONFLICT(slug) DO UPDATE(UPSERT)로 요청 10개 카테고리를 보장하고,
-- 각 카테고리가 "클릭 즉시 사용 가능"하도록 기본 게시판 '자유게시판'을 1개씩 UPSERT 한다.
--
-- 안전장치:
--  · DELETE 없음 — 기존 카테고리/게시판/게시글은 삭제하지 않는다.
--  · dev/ops 등 잔여 카테고리는 삭제하지 않고 상단에서만 제외(더보기로 강등)한다.
--  · slug UNIQUE(categories_slug_key / boards_slug_key) 기준이라 여러 번 실행해도 안전(멱등).

-- 1) 기존 모든 카테고리를 더보기(secondary)로 내린다 → 아래 10개만 상단에 남는다(dev/ops 포함 강등, 삭제 아님).
UPDATE "categories" SET "is_primary_menu" = false WHERE "is_primary_menu" = true;

-- 2) 요청 10개 카테고리 UPSERT (없으면 생성, 있으면 이름/아이콘/순서/노출 갱신).
INSERT INTO "categories" ("name", "slug", "icon", "menu_order", "sort_order", "is_primary_menu", "is_active") VALUES
  ('AI',         'ai',        '🤖', 0, 0, true, true),
  ('게임',       'game',      '🎮', 1, 1, true, true),
  ('재테크',     'money',     '💰', 2, 2, true, true),
  ('직장·부업',  'work',      '💼', 3, 3, true, true),
  ('자동차',     'car',       '🚗', 4, 4, true, true),
  ('여행',       'travel',    '✈️', 5, 5, true, true),
  ('맛집',       'food',      '🍜', 6, 6, true, true),
  ('건강·운동',  'health',    '🏃', 7, 7, true, true),
  ('중고거래',   'market',    '🛒', 8, 8, true, true),
  ('자유게시판', 'community', '💬', 9, 9, true, true)
ON CONFLICT ("slug") DO UPDATE SET
  "name"            = EXCLUDED."name",
  "icon"            = EXCLUDED."icon",
  "menu_order"      = EXCLUDED."menu_order",
  "sort_order"      = EXCLUDED."sort_order",
  "is_primary_menu" = EXCLUDED."is_primary_menu",
  "is_active"       = EXCLUDED."is_active";

-- 3) 게시판이 하나도 없는 카테고리에만 기본 게시판 '자유게시판'을 1개 생성한다.
--    · 이미 게시판이 있는 카테고리(예: ai=ChatGPT…, community=자유게시판…)에는 추가하지 않는다(NOT EXISTS).
--    · board slug = '{카테고리slug}-자유게시판' (기존 시드 toBoardSlug 규칙과 동일, 카테고리별 고유).
--    · 재실행 시엔 이미 자유게시판이 생겨 게시판이 존재하므로 대상에서 빠진다 → 멱등. 기존 게시판은 손대지 않음.
INSERT INTO "boards" ("category_id", "name", "slug", "sort_order", "is_active")
SELECT c."id", '자유게시판', c."slug" || '-자유게시판', 0, true
FROM "categories" c
WHERE c."slug" IN ('ai', 'game', 'money', 'work', 'car', 'travel', 'food', 'health', 'market', 'community')
  AND NOT EXISTS (SELECT 1 FROM "boards" b WHERE b."category_id" = c."id")
ON CONFLICT ("slug") DO NOTHING;
