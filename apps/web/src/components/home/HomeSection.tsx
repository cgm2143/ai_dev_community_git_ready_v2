import Link from 'next/link';
import * as React from 'react';

/** 메인 페이지 섹션 공통 래퍼(제목/아이콘/더보기 링크 + 내용). */
export function HomeSection({
  title,
  icon,
  moreHref,
  children,
}: {
  title: string;
  icon?: string;
  moreHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-display text-lg font-semibold text-text-primary">
          {icon && <span aria-hidden>{icon}</span>}
          {title}
        </h2>
        {moreHref && (
          <Link href={moreHref} className="text-xs text-text-muted transition-colors hover:text-text-secondary">
            더보기 ›
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
