'use client';

import * as React from 'react';
import Link from 'next/link';
import { X, ChevronDown } from 'lucide-react';
import { useCategories } from '@/features/boards/hooks/useCategories';

/**
 * 모바일 햄버거 메뉴. 더보기(Mega Menu) 대신 좌측 slide-in Drawer + Accordion 방식으로,
 * HOT + 모든 카테고리(상단 메뉴 → 더보기 순)를 세로로 나열하고, 각 카테고리를 펼치면
 * 하위 게시판이 보인다.
 */
export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: categories } = useCategories();
  const [openId, setOpenId] = React.useState<string | null>(null);

  // 열려 있는 동안: ESC로 닫기 + 뒤 배경 스크롤 잠금(포커스가 뒤로 새지 않도록 최소한의 처리).
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // 상단 메뉴(primary) 먼저, 그다음 더보기(secondary)를 menuOrder 순으로 평탄화한다.
  const flat = [...(categories ?? [])].sort((a, b) => {
    if (a.isPrimaryMenu !== b.isPrimaryMenu) return a.isPrimaryMenu ? -1 : 1;
    return a.menuOrder - b.menuOrder;
  });

  return (
    <div className={`fixed inset-0 z-40 md:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        className={`absolute left-0 top-0 flex h-full w-80 max-w-[85vw] flex-col bg-bg-surface shadow-xl transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border-hairline p-4">
          <span className="text-sm font-semibold text-text-primary">메뉴</span>
          <button type="button" onClick={onClose} aria-label="메뉴 닫기">
            <X className="h-5 w-5 text-text-muted" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          <Link
            href="/hot"
            onClick={onClose}
            className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-surface-muted"
          >
            <span aria-hidden>🔥</span>
            HOT
          </Link>

          {flat.map((category) => {
            const isOpen = openId === category.id;
            return (
              <div key={category.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : category.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm text-text-secondary hover:bg-bg-surface-muted"
                >
                  <span className="flex items-center gap-2">
                    {category.icon && <span aria-hidden>{category.icon}</span>}
                    {category.name}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="mb-1 ml-5 flex flex-col border-l border-border-hairline pl-2">
                    <Link
                      href={`/categories/${category.slug}`}
                      onClick={onClose}
                      className="rounded px-3 py-2 text-sm font-medium text-accent-primary-strong hover:bg-bg-surface-muted"
                    >
                      전체 보기
                    </Link>
                    {category.boards.map((board) => (
                      <Link
                        key={board.id}
                        href={`/boards/${board.slug}`}
                        onClick={onClose}
                        className="rounded px-3 py-2 text-sm text-text-secondary hover:bg-bg-surface-muted"
                      >
                        {board.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
