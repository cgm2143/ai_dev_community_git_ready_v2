'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCategories } from '@/features/boards/hooks/useCategories';
import { MoreMenu } from './MoreMenu';
import { MegaMenu } from './MegaMenu';

// 상단 GNB에 노출할 1차 카테고리 최대 개수(HOT 제외). 초과분은 "더보기(Mega Menu)"로 이동한다.
const MAX_PRIMARY_CATEGORIES = 5;

function itemClass(active: boolean): string {
  return `flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? 'bg-accent-primary-tint text-accent-primary-strong'
      : 'text-text-secondary hover:bg-bg-surface-muted hover:text-text-primary'
  }`;
}

/**
 * 데스크톱/태블릿 상단 GNB.
 * - 🔥 HOT: 인기글 피드(/hot)로 가는 고정 항목(카테고리가 아니라 특수 피드).
 * - 카테고리는 isPrimaryMenu 우선 → menuOrder 순으로 정렬한 뒤, 상위 MAX_PRIMARY_CATEGORIES개만 상단에 노출.
 * - 그 이후(6번째~) 카테고리는 "더보기(Mega Menu)"로 그룹화.
 *
 * "더보기"의 열림 상태와 Mega Menu 패널은 이 컴포넌트가 소유한다. 패널을 트리거 버튼이 아니라
 * 네비게이션 컨테이너 왼쪽 기준으로 배치해야 화면 밖으로 잘리지 않기 때문이다. 패널이 컨테이너의
 * DOM 자식이므로, 컨테이너를 벗어날 때만 닫혀 버튼↔패널 사이 이동 시 깜빡이지 않는다.
 */
export function Navigation() {
  const { data: categories } = useCategories();
  const pathname = usePathname();

  // isPrimaryMenu 우선 → menuOrder 순으로 정렬한 뒤, 상위 5개를 상단에, 나머지를 더보기에 배치한다
  // (모바일 드로어와 동일한 정렬 규칙).
  const sorted = [...(categories ?? [])].sort((a, b) => {
    if (a.isPrimaryMenu !== b.isPrimaryMenu) return a.isPrimaryMenu ? -1 : 1;
    return a.menuOrder - b.menuOrder;
  });
  const primary = sorted.slice(0, MAX_PRIMARY_CATEGORIES);
  const secondary = sorted.slice(MAX_PRIMARY_CATEGORIES);

  const [moreOpen, setMoreOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMoreOpen(true);
  };
  const closeSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMoreOpen(false), 120);
  };

  React.useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  return (
    <div
      className="relative"
      onMouseLeave={secondary.length > 0 ? closeSoon : undefined}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setMoreOpen(false);
      }}
    >
      <nav className="flex items-center gap-0.5">
        <Link href="/hot" className={itemClass(pathname === '/hot')}>
          <span aria-hidden>🔥</span>
          HOT
        </Link>

        {primary.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className={itemClass(pathname === `/categories/${category.slug}`)}
          >
            {category.icon && <span aria-hidden>{category.icon}</span>}
            {category.name}
          </Link>
        ))}

        {secondary.length > 0 && (
          <MoreMenu open={moreOpen} onOpen={openNow} onToggle={() => setMoreOpen((prev) => !prev)} />
        )}
      </nav>

      {secondary.length > 0 && (
        <MegaMenu categories={secondary} open={moreOpen} onClose={() => setMoreOpen(false)} />
      )}
    </div>
  );
}
