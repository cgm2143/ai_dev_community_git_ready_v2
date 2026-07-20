'use client';

import Link from 'next/link';
import { useCategories } from '@/features/boards/hooks/useCategories';

/**
 * 카테고리 랜딩 페이지. 상단 GNB/더보기에서 카테고리를 클릭하면 이곳으로 오며,
 * 해당 카테고리에 속한 하위 게시판 목록을 보여준다. 카테고리 데이터는 이미 캐싱된
 * useCategories(전체 목록)에서 slug로 찾아 재사용한다(추가 요청 없음).
 */
export default function CategoryPage({ params }: { params: { slug: string } }) {
  const { data: categories, isLoading } = useCategories();
  const category = categories?.find((item) => item.slug === params.slug);

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-card bg-bg-surface-muted" />;
  }

  if (!category) {
    return <p className="text-sm text-text-muted">카테고리를 찾을 수 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {category.icon && (
          <span aria-hidden className="text-2xl">
            {category.icon}
          </span>
        )}
        <h1 className="font-display text-xl font-semibold text-text-primary">{category.name}</h1>
      </div>

      {category.boards.length === 0 ? (
        <p className="text-sm text-text-muted">아직 게시판이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {category.boards.map((board) => (
            <Link
              key={board.id}
              href={`/boards/${board.slug}`}
              className="rounded-card border border-border-hairline bg-bg-surface p-4 transition-colors hover:border-accent-primary/40 hover:bg-bg-surface-muted"
            >
              <p className="text-sm font-semibold text-text-primary">{board.name}</p>
              {board.description && (
                <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{board.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
