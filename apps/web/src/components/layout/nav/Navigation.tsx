'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useCategories } from '@/features/boards/hooks/useCategories';

// isPrimaryMenu=true가 하나도 없을 때만 쓰는 fallback 개수(menuOrder 상위 N개).
const FALLBACK_PRIMARY_COUNT = 5;

// 마우스 오버 시 글자색을 포인트(보라)로 바꾼다. 열림(active) 상태는 보라 틴트 배경 + 보라 글자.
function itemClass(active: boolean): string {
  return `flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? 'bg-accent-primary-tint text-accent-primary-strong'
      : 'text-text-secondary hover:text-accent-primary-strong'
  }`;
}

/**
 * 데스크톱/태블릿 상단 GNB.
 * - 🔥 HOT: 인기글 피드(/hot)로 가는 고정 항목.
 * - 각 1차 카테고리는 클릭하면 2차 카테고리(게시판) 목록이 펼쳐지고, 다시 클릭하면 접힌다(토글, 한 번에 하나).
 * - "더보기(Mega Menu)"는 제거했다. isPrimaryMenu=true 카테고리만 상단에 노출한다.
 */
export function Navigation() {
  const { data: categories } = useCategories();
  const pathname = usePathname();

  const sorted = [...(categories ?? [])].sort((a, b) => a.menuOrder - b.menuOrder);
  const flagged = sorted.filter((category) => category.isPrimaryMenu);
  const primary = flagged.length > 0 ? flagged : sorted.slice(0, FALLBACK_PRIMARY_COUNT);

  const [openId, setOpenId] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // 바깥 영역 클릭 시 닫기.
  React.useEffect(() => {
    if (!openId) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpenId(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [openId]);

  // 게시판으로 이동(경로 변경)하면 열린 메뉴를 닫는다.
  React.useEffect(() => {
    setOpenId(null);
  }, [pathname]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpenId(null);
      }}
    >
      <nav className="flex items-center gap-0.5">
        <Link href="/hot" className={itemClass(pathname === '/hot')}>
          <span aria-hidden>🔥</span>
          HOT
        </Link>

        {primary.map((category) => {
          const isOpen = openId === category.id;
          return (
            <div key={category.id} className="relative">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenId((prev) => (prev === category.id ? null : category.id))}
                className={itemClass(isOpen)}
              >
                {category.name}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* 2차 카테고리(게시판) 드롭다운 */}
              {isOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-md border border-border-hairline bg-bg-surface p-1.5 shadow-lg">
                  {category.boards.length > 0 ? (
                    <ul className="flex flex-col">
                      {category.boards.map((board) => (
                        <li key={board.id}>
                          <Link
                            href={`/boards/${board.slug}`}
                            onClick={() => setOpenId(null)}
                            className="block rounded px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-bg-surface-muted hover:text-accent-primary-strong"
                          >
                            {board.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-3 py-1.5 text-xs text-text-muted">준비 중</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
