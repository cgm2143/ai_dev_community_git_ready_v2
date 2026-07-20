'use client';

import Link from 'next/link';
import type { PostListItem } from '@/features/posts/api/posts.api';

/** 번호가 매겨진 컴팩트 목록(실시간 인기 / 많이 보는 글 등). */
export function RankedPostList({ items, isLoading }: { items: PostListItem[] | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-6 animate-pulse rounded bg-bg-surface-muted" />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return <p className="text-sm text-text-muted">아직 게시글이 없습니다.</p>;
  }

  return (
    <ol className="flex flex-col">
      {items.map((post, index) => (
        <li key={post.id}>
          <Link
            href={`/boards/${post.boardSlug}/${post.id}`}
            className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-bg-surface-muted"
          >
            <span className={`w-5 shrink-0 text-center text-sm font-bold ${index < 3 ? 'text-accent-primary-strong' : 'text-text-muted'}`}>
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{post.title}</span>
            {post.commentCount > 0 && (
              <span className="shrink-0 font-mono text-xs text-text-muted">[{post.commentCount}]</span>
            )}
          </Link>
        </li>
      ))}
    </ol>
  );
}
