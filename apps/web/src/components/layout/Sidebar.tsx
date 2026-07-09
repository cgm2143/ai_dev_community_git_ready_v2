'use client';

import Link from 'next/link';
import { useCategories } from '@/features/boards/hooks/useCategories';

export function Sidebar() {
  const { data: categories, isLoading } = useCategories();

  return (
    <aside className="hidden w-sidebar shrink-0 border-r border-border-hairline bg-bg-surface p-4 lg:block">
      <nav className="flex flex-col gap-4">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-4 w-24 animate-pulse rounded bg-bg-surface-muted" />
          ))}

        {categories?.map((category) => (
          <div key={category.id}>
            <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {category.name}
            </p>
            <ul className="flex flex-col gap-0.5">
              {category.boards.map((board) => (
                <li key={board.id}>
                  <Link
                    href={`/boards/${board.slug}`}
                    className="block rounded px-2 py-1.5 text-sm text-text-secondary hover:bg-bg-surface-muted hover:text-text-primary"
                  >
                    {board.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
