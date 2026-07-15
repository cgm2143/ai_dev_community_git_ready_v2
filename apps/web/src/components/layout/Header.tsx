'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const logoutMutation = useLogout();
  const [query, setQuery] = React.useState('');
  const { data: notifications } = useNotifications(false, Boolean(user));
  const unreadCount = user ? (notifications?.meta?.unreadCount ?? 0) : 0;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border-hairline bg-bg-surface">
      {/* 본문(홈 피드 등)이 max-w-[1280px]로 가운데 정렬되는 것과 맞춰, 헤더 내용도
          같은 폭 안에서 가운데로 모이도록 감싼다 - 그렇지 않으면 화면이 넓을 때
          로고/버튼이 브라우저 양쪽 끝에 붙어 본문과 정렬이 안 맞아 보인다. */}
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center justify-center gap-4 px-4">
        <Logo />

        <form onSubmit={handleSearchSubmit} className="relative hidden max-w-md flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="게시글, 태그, 회원 검색"
            className="pl-9"
          />
        </form>

        <div className="flex items-center gap-1.5">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? '...' : '로그아웃'}
              </Button>
            </>
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
      </div>
    </header>
  );
}
