'use client';

import { ChevronDown } from 'lucide-react';

/**
 * 상단 GNB 마지막의 "⋯ 더보기" 트리거 버튼. 열림 상태/드롭다운(MegaMenu)은 부모(Navigation)가
 * 소유하며(패널을 나브 전체 폭 기준으로 배치하기 위함), 이 컴포넌트는 Hover/Click만 전달한다.
 */
export function MoreMenu({
  open,
  onOpen,
  onToggle,
}: {
  open: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={onOpen}
      onClick={onToggle}
      aria-expanded={open}
      aria-haspopup="menu"
      className={`flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        open
          ? 'bg-bg-surface-muted text-text-primary'
          : 'text-text-secondary hover:bg-bg-surface-muted hover:text-text-primary'
      }`}
    >
      <span aria-hidden>⋯</span>
      더보기
      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
    </button>
  );
}
