-- 상단 GNB(내비게이션) 카테고리 재구성.
-- 요청: AI · 게임 · 재테크 · 직장·부업 · 자동차 · 여행 · 맛집 · 건강·운동 · 중고거래 · 자유게시판(이 순서)을
--       상단에 노출(is_primary_menu=true), 나머지(디지털/영화/가족/취미)는 "더보기"로 이동.
--
-- 카테고리 행의 노출/순서/이름만 갱신한다. 게시판(boards)/게시글(posts)은 건드리지 않으며,
-- slug 기준 멱등 UPDATE라 여러 번 실행하거나 해당 slug가 없어도 안전하다(0 rows no-op).
-- (소스 오브 트루스인 DEFAULT_CATEGORY_SEED와 동일한 최종 상태로 맞춘다.)

-- 이름 변경: 음식 → 맛집, 커뮤니티 → 자유게시판
UPDATE "categories" SET "name" = '맛집'       WHERE "slug" = 'food'      AND "name" <> '맛집';
UPDATE "categories" SET "name" = '자유게시판' WHERE "slug" = 'community' AND "name" <> '자유게시판';

-- 상단 노출(primary) 10개 + 순서(menu_order/sort_order)
UPDATE "categories" SET "is_primary_menu" = true,  "menu_order" = 0,  "sort_order" = 0  WHERE "slug" = 'ai';
UPDATE "categories" SET "is_primary_menu" = true,  "menu_order" = 1,  "sort_order" = 1  WHERE "slug" = 'game';
UPDATE "categories" SET "is_primary_menu" = true,  "menu_order" = 2,  "sort_order" = 2  WHERE "slug" = 'money';
UPDATE "categories" SET "is_primary_menu" = true,  "menu_order" = 3,  "sort_order" = 3  WHERE "slug" = 'work';
UPDATE "categories" SET "is_primary_menu" = true,  "menu_order" = 4,  "sort_order" = 4  WHERE "slug" = 'car';
UPDATE "categories" SET "is_primary_menu" = true,  "menu_order" = 5,  "sort_order" = 5  WHERE "slug" = 'travel';
UPDATE "categories" SET "is_primary_menu" = true,  "menu_order" = 6,  "sort_order" = 6  WHERE "slug" = 'food';
UPDATE "categories" SET "is_primary_menu" = true,  "menu_order" = 7,  "sort_order" = 7  WHERE "slug" = 'health';
UPDATE "categories" SET "is_primary_menu" = true,  "menu_order" = 8,  "sort_order" = 8  WHERE "slug" = 'market';
UPDATE "categories" SET "is_primary_menu" = true,  "menu_order" = 9,  "sort_order" = 9  WHERE "slug" = 'community';

-- 더보기(secondary) 나머지
UPDATE "categories" SET "is_primary_menu" = false, "menu_order" = 10, "sort_order" = 10 WHERE "slug" = 'digital';
UPDATE "categories" SET "is_primary_menu" = false, "menu_order" = 11, "sort_order" = 11 WHERE "slug" = 'movie';
UPDATE "categories" SET "is_primary_menu" = false, "menu_order" = 12, "sort_order" = 12 WHERE "slug" = 'family';
UPDATE "categories" SET "is_primary_menu" = false, "menu_order" = 13, "sort_order" = 13 WHERE "slug" = 'hobby';
