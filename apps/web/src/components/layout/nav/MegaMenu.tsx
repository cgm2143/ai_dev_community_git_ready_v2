'use client';

import Link from 'next/link';
import type { CategoryWithBoards } from '@/features/boards/api/boards.api';

/**
 * "더보기" 클릭/Hover 시 열리는 대형 드롭다운(Mega Menu).
 * 여러 보조 카테고리를 카드 형태(아이콘 + 이름 + 하위 게시판)로 2~4열 그리드에 한 번에 보여준다.
 * open 상태에 따라 fade + slide 트랜지션으로 부드럽게 나타난다.
 */
export function MegaMenu({
  categories,
  open,
  onClose,
}: {
  categories: CategoryWithBoards[];
  open: boolean;
  onClose: () => void;
}) {
  return (
    <div
      role="menu"
      className={`absolute left-0 top-full z-30 mt-1.5 w-[min(760px,92vw)] rounded-card border border-border-hairline bg-bg-surface p-5 shadow-lg transition-all duration-200 ease-out ${
        open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1.5 opacity-0'
      }`}
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => (
          <div key={category.id}>
            <Link
              href={`/categories/${category.slug}`}
              onClick={onClose}
              className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-text-primary hover:text-accent-primary-strong"
            >
              {category.name}
            </Link>
            <ul className="flex flex-col gap-0.5">
              {category.boards.slice(0, 5).map((board) => (
                <li key={board.id}>
                  <Link
                    href={`/boards/${board.slug}`}
                    onClick={onClose}
                    className="block rounded px-1 py-1 text-sm text-text-secondary hover:text-text-primary"
                  >
                    {board.name}
                  </Link>
                </li>
              ))}
              {category.boards.length === 0 && (
                <li className="px-1 py-1 text-xs text-text-muted">준비 중</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
