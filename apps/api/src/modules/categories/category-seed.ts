import { PrismaClient } from '@prisma/client';

export interface CategorySeed {
  name: string;
  slug: string;
  icon: string;
  isPrimaryMenu: boolean;
  boards: string[];
}

/**
 * 서비스 기본 카테고리 시드 (대분류 Category → 게시판 Board, 2단계 고정).
 * - isPrimaryMenu=true → 상단 GNB, false → 더보기(Mega Menu).
 * - 배열 순서가 menuOrder(작을수록 앞).
 * - 🔥 HOT은 카테고리가 아니라 인기글 집계 허브이므로 여기 없다.
 *
 * 이 데이터는 (1) Prisma 시드 스크립트(prisma/seed.ts)와 (2) 관리자 "카테고리 초기화" 기능이
 * 공통으로 사용한다. 하드코딩을 이 파일 한 곳으로 모아 두 경로가 항상 동일한 결과를 내도록 한다.
 */
export const DEFAULT_CATEGORY_SEED: CategorySeed[] = [
  // ── 상단 GNB (primary) ──
  { name: 'AI', slug: 'ai', icon: '🤖', isPrimaryMenu: true, boards: ['ChatGPT', 'Claude', 'Gemini', 'AI 이미지', 'AI 영상', 'AI 개발', 'AI 자동화', '프롬프트', 'AI 뉴스'] },
  { name: '게임', slug: 'game', icon: '🎮', isPrimaryMenu: true, boards: ['PC', '모바일', '콘솔', 'Steam', '롤', '발로란트', '메이플'] },
  { name: '재테크', slug: 'money', icon: '💰', isPrimaryMenu: true, boards: ['국내주식', '미국주식', 'ETF', '가상자산', '부동산', '청약', '절약', '경제뉴스'] },
  { name: '직장·부업', slug: 'work', icon: '💼', isPrimaryMenu: true, boards: ['취업', '이직', '회사생활', '창업', '프리랜서', '스마트스토어', '애드센스'] },
  { name: '디지털', slug: 'digital', icon: '💻', isPrimaryMenu: true, boards: ['스마트폰', 'PC', 'Apple', 'Samsung', '프로그래밍', 'IT 뉴스'] },
  // ── 더보기 Mega Menu (secondary) ──
  // 커뮤니티: HOT 허브가 모아 보여주는 자유게시판/질문답변 등 일반 게시판의 실제 소속 카테고리.
  { name: '커뮤니티', slug: 'community', icon: '💬', isPrimaryMenu: false, boards: ['자유게시판', '질문답변', '유머', '정보공유'] },
  { name: '자동차', slug: 'car', icon: '🚗', isPrimaryMenu: false, boards: ['신차', '중고차', '전기차'] },
  { name: '여행', slug: 'travel', icon: '✈️', isPrimaryMenu: false, boards: ['국내', '일본', '동남아'] },
  { name: '음식', slug: 'food', icon: '🍜', isPrimaryMenu: false, boards: ['맛집', '카페', '레시피'] },
  { name: '영화', slug: 'movie', icon: '🎬', isPrimaryMenu: false, boards: ['영화', '드라마', 'OTT'] },
  { name: '건강·운동', slug: 'health', icon: '🏃', isPrimaryMenu: false, boards: ['헬스', '러닝', '다이어트'] },
  { name: '가족', slug: 'family', icon: '👶', isPrimaryMenu: false, boards: ['육아', '교육', '반려동물'] },
  { name: '취미', slug: 'hobby', icon: '🎨', isPrimaryMenu: false, boards: ['사진', '음악', '독서'] },
  { name: '중고거래', slug: 'market', icon: '🛒', isPrimaryMenu: false, boards: ['삽니다', '팝니다', '나눔'] },
];

/** 게시판 slug 생성: `{카테고리slug}-{정규화된 게시판명}` (한글 허용). 카테고리 접두사로 중복을 방지한다. */
export function toBoardSlug(categorySlug: string, boardName: string): string {
  const normalized = boardName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${categorySlug}-${normalized}`;
}

/**
 * 시드 데이터를 DB에 멱등하게 반영한다. slug 기준 upsert + 시드 목록에 없는 과거 카테고리는
 * best-effort로 정리한다(게시글 없는 게시판/게시판 없는 카테고리만 삭제, 실패 무시).
 * PrismaClient(시드 스크립트) 또는 이를 상속한 PrismaService(NestJS) 어느 쪽으로도 호출 가능하다.
 */
export async function applyCategorySeed(
  prisma: PrismaClient,
  seed: CategorySeed[] = DEFAULT_CATEGORY_SEED,
): Promise<void> {
  for (const [index, category] of seed.entries()) {
    const createdCategory = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        icon: category.icon,
        sortOrder: index,
        menuOrder: index,
        isPrimaryMenu: category.isPrimaryMenu,
      },
      create: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        sortOrder: index,
        menuOrder: index,
        isPrimaryMenu: category.isPrimaryMenu,
      },
    });

    for (const [boardIndex, boardName] of category.boards.entries()) {
      const slug = toBoardSlug(category.slug, boardName);
      await prisma.board.upsert({
        where: { slug },
        update: { name: boardName, sortOrder: boardIndex, categoryId: createdCategory.id },
        create: { name: boardName, slug, sortOrder: boardIndex, categoryId: createdCategory.id },
      });
    }
  }

  await cleanupLegacyCategories(prisma, seed);
}

async function cleanupLegacyCategories(prisma: PrismaClient, seed: CategorySeed[]): Promise<void> {
  const keepSlugs = seed.map((category) => category.slug);
  const legacyCategories = await prisma.category.findMany({
    where: { slug: { notIn: keepSlugs } },
    include: { boards: true },
  });

  for (const category of legacyCategories) {
    for (const board of category.boards) {
      const postCount = await prisma.post.count({ where: { boardId: board.id } });
      if (postCount === 0) {
        await prisma.board.delete({ where: { id: board.id } }).catch(() => undefined);
      }
    }

    const remainingBoards = await prisma.board.count({ where: { categoryId: category.id } });
    if (remainingBoards === 0) {
      await prisma.category.delete({ where: { id: category.id } }).catch(() => undefined);
    }
  }
}
