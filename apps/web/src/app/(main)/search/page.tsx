'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useSearchPosts } from '@/features/search/hooks/useSearchPosts';
import { PostList } from '@/components/post/PostList';
import { Pagination } from '@/components/common/Pagination';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 20;

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get('q') ?? '';
  const [page, setPage] = React.useState(1);
  const [inputValue, setInputValue] = React.useState(q);

  React.useEffect(() => {
    setInputValue(q);
    setPage(1);
  }, [q]);

  const { data, isLoading, isError } = useSearchPosts({ q, page, limit: PAGE_SIZE });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="게시글 제목, 본문 검색"
          className="pl-9"
        />
      </form>

      {q ? (
        <>
          <p className="text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">&ldquo;{q}&rdquo;</span> 검색 결과{' '}
            {data && <Pagination page={page} limit={PAGE_SIZE} total={data.meta.total} onPageChange={setPage} />}
          </p>

          <PostList
            items={data?.items}
            isLoading={isLoading}
            isError={isError}
            emptyMessage="검색 결과가 없습니다. 다른 키워드로 시도해 보세요."
          />

          {data && <Pagination page={page} limit={PAGE_SIZE} total={data.meta.total} onPageChange={setPage} />}
        </>
      ) : (
        <p className="rounded-card border border-border-hairline bg-bg-surface p-6 text-center text-sm text-text-secondary">
          검색어를 입력해 게시글을 찾아보세요.
        </p>
      )}
    </div>
  );
}
