'use client';

import * as React from 'react';
import Link from 'next/link';
import { PenSquare } from 'lucide-react';
import { useBoardPosts } from '@/features/boards/hooks/useBoard';
import { PostList } from '@/components/post/PostList';
import { Pagination } from '@/components/common/Pagination';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 20;

interface BoardViewProps {
  boardSlug: string;
  /** 서버에서 미리 받아온 게시판 이름. 클라이언트 로딩 중 URL 인코딩된 slug가 잠깐 노출되는 것을 막는다. */
  boardName: string;
  boardDescription: string | null;
}

export function BoardView({ boardSlug, boardName, boardDescription }: BoardViewProps) {
  const [page, setPage] = React.useState(1);
  const [sort, setSort] = React.useState<'latest' | 'popular'>('latest');

  const postsQuery = useBoardPosts(boardSlug, { page, limit: PAGE_SIZE, sort });

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb items={[{ label: boardName }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-text-primary">{boardName}</h1>
          {boardDescription && (
            <p className="mt-1 text-sm text-text-secondary">{boardDescription}</p>
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
