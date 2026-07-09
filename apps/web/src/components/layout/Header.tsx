'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const { data: notifications } = useNotifications(false, Boolean(user));
  const unreadCount = user ? (notifications?.meta.unreadCount ?? 0) : 0;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-border-hairline bg-bg-surface px-4">
      <Link href="/" className="shrink-0 font-display text-lg font-semibold text-text-primary">
        Dev<span className="text-accent-primary-strong">Hub</span>
      </Link>

      <form onSubmit={handleSearchSubmit} className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="게시글, 태그, 회원 검색"
          className="pl-9"
        />
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />

        {user ? (
          <>
            <Button variant="ghost" size="icon" aria-label="알림" asChild className="relative">
              <Link href="/notifications">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-danger px-1 font-mono text-[10px] text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/profile/${user.nickname}`}>{user.nickname}</Link>
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">로그인</Link>
            </Button>
            <Button variant="primary" size="sm" asChild>
              <Link href="/register">가입하기</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
