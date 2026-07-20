'use client';

import Link from 'next/link';
import { useCategoryPosts } from '@/features/posts/hooks/useCategoryPosts';
import { CompactPostList } from '@/components/post/CompactPostList';

/** 카테고리별 최신글 컬럼 하나. 여러 개를 그리드로 동시에 보여준다. */
export function CategoryColumn({ slug, name, icon }: { slug: string; name: string; icon: string | null }) {
  const { data, isLoading } = useCategoryPosts(slug, 5);

  return (
    <div className="rounded-card border border-border-hairline bg-bg-surface p-4">
      <Link
        href={`/categories/${slug}`}
        className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-text-primary hover:text-accent-primary-strong"
      >
        {icon && <span aria-hidden>{icon}</span>}
        {name}
      </Link>
      <CompactPostList items={data?.items} isLoading={isLoading} limit={5} emptyMessage="아직 글이 없습니다." />
    </div>
  );
}
