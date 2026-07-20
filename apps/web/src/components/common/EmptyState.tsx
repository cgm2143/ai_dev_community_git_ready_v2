import Link from 'next/link';

export interface EmptyStateAction {
  label: string;
  href: string;
}

/** 빈 상태 + CTA. 목록/피드가 비었을 때 다음 행동을 유도한다. */
export function EmptyState({ message, actions }: { message: string; actions?: EmptyStateAction[] }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-border-hairline bg-bg-surface p-8 text-center">
      <p className="text-sm text-text-secondary">{message}</p>
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {actions.map((action) => (
            <Link
              key={`${action.href}-${action.label}`}
              href={action.href}
              className="rounded-md border border-border-hairline px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent-primary/40 hover:text-text-primary"
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
