'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { usePopularSearchTerms } from '@/features/search/hooks/usePopularSearchTerms';

/**
 * 사이드바 최상단 검색 위젯: 검색바 + 인기 검색어 Top 5.
 * - 검색바 제출/검색어 클릭 시 /search?q= 로 이동해 제목·본문에 매칭되는 글 목록을 보여준다.
 * - 인기 검색어는 GET /search/popular(Redis 누적 집계) 상위 5개.
 */
export function SearchWidget() {
  const router = useRouter();
  const [value, setValue] = React.useState('');
  const { data: terms } = usePopularSearchTerms();
  const top5 = (terms ?? []).slice(0, 5);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border-hairline bg-bg-surface p-4">
      <form onSubmit={submit} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="검색어를 입력하세요"
          aria-label="사이트 검색"
          className="h-10 w-full rounded-md border border-border-hairline bg-bg-page pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        />
      </form>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">인기 검색어</h4>
        {top5.length > 0 ? (
          <ol className="flex flex-col">
            {top5.map((item, index) => (
              <li key={item.term}>
                <Link
                  href={`/search?q=${encodeURIComponent(item.term)}`}
                  className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-bg-surface-muted"
                >
                  <span
                    className={`w-4 shrink-0 text-center text-xs font-bold ${
                      index < 3 ? 'text-accent-primary-strong' : 'text-text-muted'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="truncate text-sm text-text-secondary">{item.term}</span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-text-muted">아직 인기 검색어가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
