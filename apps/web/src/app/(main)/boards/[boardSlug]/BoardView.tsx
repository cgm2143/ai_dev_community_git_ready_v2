'use client';

import * as React from 'react';
import Link from 'next/link';
import { PenSquare } from 'lucide-react';
import { useBoard, useBoardPosts } from '@/features/boards/hooks/useBoard';
import { PostList } from '@/components/post/PostList';
import { Pagination } from '@/components/common/Pagination';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 20;

export function BoardView({ boardSlug }: { boardSlug: string }) {
  const [page, setPage] = React.useState(1);
  const [sort, setSort] = React.useState<'latest' | 'popular'>('latest');

  const boardQuery = useBoard(boardSlug);
  const postsQuery = useBoardPosts(boardSlug, { page, limit: PAGE_SIZE, sort });

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb items={[{ label: boardQuery.data?.name ?? boardSlug }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-text-primary">
            {boardQuery.data?.name ?? boardSlug}
          </h1>
          {boardQuery.data?.description && (
            <p className="mt-1 text-sm text-text-secondary">{boardQuery.data.description}</p>
          )}
        </div>
        <Button variant="primary" size="sm" asChild>
          <Link href="/write">
            <PenSquare className="h-4 w-4" />
            글쓰기
          </Link>
        </Button>
      </div>

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => {
            setSort('latest');
            setPage(1);
          }}
          className={sort === 'latest' ? 'font-semibold text-accent-primary-strong' : 'text-text-muted'}
        >
          최신순
        </button>
        <span className="text-text-muted">·</span>
        <button
          type="button"
          onClick={() => {
            setSort('popular');
            setPage(1);
          }}
          className={sort === 'popular' ? 'font-semibold text-accent-primary-strong' : 'text-text-muted'}
        >
          인기순
        </button>
      </div>

      <PostList
        items={postsQuery.data?.items}
        isLoading={postsQuery.isLoading}
        isError={postsQuery.isError}
        emptyMessage="이 게시판에는 아직 게시글이 없습니다."
      />

      {postsQuery.data && (
        <Pagination page={page} limit={PAGE_SIZE} total={postsQuery.data.meta?.total ?? 0} onPageChange={setPage} />
      )}
    </div>
  );
}
