'use client';

import Link from 'next/link';
import type { PostListItem } from '@/features/posts/api/posts.api';

/**
 * 제목 위주 컴팩트 목록. numbered=true면 순위 번호를 표시한다(실시간 인기/많이 보는 글).
 * 랭킹 리스트와 카테고리 최신글 리스트가 공유한다.
 */
export function CompactPostList({
  items,
  isLoading,
  numbered = false,
  emptyMessage = '아직 게시글이 없습니다.',
  limit,
}: {
  items: PostListItem[] | undefined;
  isLoading: boolean;
  numbered?: boolean;
  emptyMessage?: string;
  limit?: number;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-6 animate-pulse rounded bg-bg-surface-muted" />
        ))}
      </div>
    );
  }

  const rows = limit ? (items ?? []).slice(0, limit) : items ?? [];
  if (rows.length === 0) {
    return <p className="text-sm text-text-muted">{emptyMessage}</p>;
  }

  return (
    <ol className="flex flex-col">
      {rows.map((post, index) => (
        <li key={post.id}>
          <Link
            href={`/boards/${post.boardSlug}/${post.id}`}
            className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-bg-surface-muted"
          >
            {numbered && (
              <span className={`w-5 shrink-0 text-center text-sm font-bold ${index < 3 ? 'text-accent-primary-strong' : 'text-text-muted'}`}>
                {index + 1}
              </span>
            )}
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
