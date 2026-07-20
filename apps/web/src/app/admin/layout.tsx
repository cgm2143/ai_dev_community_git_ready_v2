'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Logo } from '@/components/layout/Logo';

const NAV_ITEMS = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/users', label: '회원 관리' },
  { href: '/admin/reports', label: '신고 처리' },
  { href: '/admin/categories', label: '카테고리 관리' },
  { href: '/admin/ads', label: '광고 관리' },
  { href: '/admin/words', label: '금칙어 관리' },
  { href: '/admin/ip-bans', label: 'IP 차단' },
  { href: '/admin/settings', label: '사이트 설정' },
  { href: '/admin/logs', label: '관리자 로그' },
];

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'MODERATOR']);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isBootstrapping && (!user || !ADMIN_ROLES.has(user.role))) {
      router.replace('/');
    }
  }, [isBootstrapping, user, router]);

  if (isBootstrapping || !user || !ADMIN_ROLES.has(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border-hairline bg-bg-surface p-4">
        <div className="mb-6">
          <Logo height={22} />
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                pathname === item.href
                  ? 'rounded bg-accent-primary-tint px-3 py-2 text-sm font-semibold text-accent-primary-strong'
                  : 'rounded px-3 py-2 text-sm text-text-secondary hover:bg-bg-surface-muted'
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 bg-bg-page p-6">{children}</main>
    </div>
  );
}
