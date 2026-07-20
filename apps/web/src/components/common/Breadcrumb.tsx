import Link from 'next/link';

export interface Crumb {
  label: string;
  href?: string;
}

/** 위치 경로 표시. 항상 "홈"에서 시작한다. */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-text-muted">
      <Link href="/" className="hover:text-text-secondary">
        홈
      </Link>
      {items.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
          <span aria-hidden>›</span>
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-text-secondary">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-text-secondary">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
