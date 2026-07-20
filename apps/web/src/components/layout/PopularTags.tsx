'use client';

import Link from 'next/link';
import { usePopularTags } from '@/features/tags/hooks/usePopularTags';

/** 인기 태그 칩. 클릭 시 태그 탐색 페이지(/tag/[name])로 이동한다. */
export function PopularTags() {
  const { data: tags } = usePopularTags(20);

  if (!tags || tags.length === 0) {
    return <p className="text-sm text-text-muted">아직 인기 태그가 없습니다.</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <Link
          key={tag.name}
          href={`/tag/${encodeURIComponent(tag.name)}`}
          className="rounded-full bg-bg-surface-muted px-2.5 py-1 text-xs text-text-secondary transition-colors hover:text-text-primary"
        >
          #{tag.name}
        </Link>
      ))}
    </div>
  );
}
