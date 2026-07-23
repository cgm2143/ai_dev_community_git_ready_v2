'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useSearchPosts } from '@/features/search/hooks/useSearchPosts';
import type { SearchSort } from '@/features/search/api/search.api';
import { useCategories } from '@/features/boards/hooks/useCategories';
import { PostList } from '@/components/post/PostList';
import { Pagination } from '@/components/common/Pagination';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 20;

const SORT_OPTIONS: { value: SearchSort; label: string }[] = [
  { value: 'relevance', label: '관련도순' },
  { value: 'latest', label: '최신순' },
  { value: 'views', label: '조회순' },
  { value: 'likes', label: '추천순' },
];

const selectClass =
  'h-9 rounded-md border border-border-hairline bg-bg-surface px-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get('q') ?? '';

  const [inputValue, setInputValue] = React.useState(q);
  const [page, setPage] = React.useState(1);
  const [categoryId, setCategoryId] = React.useState('');
  const [boardId, setBoardId] = React.useState('');
  const [tag, setTag] = React.useState('');
  const [tagDraft, setTagDraft] = React.useState('');
  const [sort, setSort] = React.useState<SearchSort>('relevance');

  const { data: categories } = useCategories();
  const categoryList = categories ?? [];
  // 카테고리 선택 시 해당 카테고리의 게시판만 Board Select에 노출한다.
  const boardOptions = categoryId
    ? categoryList.find((category) => category.id === categoryId)?.boards ?? []
    : categoryList.flatMap((category) => category.boards);

  React.useEffect(() => {
    setInputValue(q);
    setPage(1);
  }, [q]);

  // 필터/정렬이 바뀌면 항상 1페이지부터 다시 본다.
  const resetPage = () => setPage(1);

  const handleCategory = (value: string) => {
    setCategoryId(value);
    setBoardId(''); // 카테고리가 바뀌면 하위 게시판 선택을 초기화한다.
    resetPage();
  };
  const handleBoard = (value: string) => {
    setBoardId(value);
    resetPage();
  };
  const handleSort = (value: SearchSort) => {
    setSort(value);
    resetPage();
  };
  const commitTag = () => {
    const next = tagDraft.trim();
    if (next !== tag) {
      setTag(next);
      resetPage();
    }
  };

  const { data, isLoading, isError } = useSearchPosts({
    q,
    categoryId: categoryId || undefined,
    boardId: boardId || undefined,
    tag: tag || undefined,
    sort,
    page,
    limit: PAGE_SIZE,
  });

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

      {q && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryId}
            onChange={(e) => handleCategory(e.target.value)}
            className={selectClass}
            aria-label="카테고리 필터"
          >
            <option value="">전체 카테고리</option>
            {categoryList.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={boardId}
            onChange={(e) => handleBoard(e.target.value)}
            className={selectClass}
            aria-label="게시판 필터"
          >
            <option value="">전체 게시판</option>
            {boardOptions.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </select>

          <Input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onBlur={commitTag}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitTag();
              }
            }}
            placeholder="태그 (Enter)"
            className="h-9 w-36"
            aria-label="태그 필터"
          />

          <select
            value={sort}
            onChange={(e) => handleSort(e.target.value as SearchSort)}
            className={`${selectClass} ml-auto`}
            aria-label="정렬"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {q ? (
        <>
          <p className="text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">&ldquo;{q}&rdquo;</span> 검색 결과{' '}
            {data ? `${data.meta?.total ?? 0}건` : ''}
          </p>

          <PostList
            items={data?.items}
            isLoading={isLoading}
            isError={isError}
            emptyMessage="검색 결과가 없습니다. 다른 키워드로 시도해 보세요."
          />

          {data && <Pagination page={page} limit={PAGE_SIZE} total={data.meta?.total ?? 0} onPageChange={setPage} />}
        </>
      ) : (
        <p className="rounded-card border border-border-hairline bg-bg-surface p-6 text-center text-sm text-text-secondary">
          검색어를 입력해 게시글을 찾아보세요.
        </p>
      )}
    </div>
  );
}
