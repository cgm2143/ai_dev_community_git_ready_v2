'use client';

import Link from 'next/link';
import { useCategoryPosts } from '@/features/posts/hooks/useCategoryPosts';

/** 카테고리별 최신글 컬럼 하나. 여러 개를 그리드로 동시에 보여준다. */
export function CategoryColumn({ slug, name, icon }: { slug: string; name: string; icon: string | null }) {
  const { data, isLoading } = useCategoryPosts(slug, 5);
  const items = data?.items ?? [];

  return (
    <div className="rounded-card border border-border-hairline bg-bg-surface p-4">
      <Link
        href={`/categories/${slug}`}
        className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-text-primary hover:text-accent-primary-strong"
      >
        {icon && <span aria-hidden>{icon}</span>}
        {name}
      </Link>

      {isLoading ? (
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-bg-surface-muted" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {items.slice(0, 5).map((post) => (
            <li key={post.id}>
              <Link
                href={`/boards/${post.boardSlug}/${post.id}`}
                className="block truncate rounded px-1 py-1 text-sm text-text-secondary hover:text-text-primary"
              >
                {post.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-text-muted">아직 글이 없습니다.</p>
      )}
    </div>
  );
}
