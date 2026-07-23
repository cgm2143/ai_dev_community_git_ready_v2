'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Menu, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { Navigation } from './nav/Navigation';
import { MobileDrawer } from './nav/MobileDrawer';
import { NotificationBell } from '@/components/notification/NotificationBell';

export function Header() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const logoutMutation = useLogout();
  const [query, setQuery] = React.useState('');
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

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
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-3 px-4">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="메뉴 열기"
          className="-ml-1 rounded-md p-1.5 text-text-secondary hover:bg-bg-surface-muted md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

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
          <Button
            variant="ghost"
            size="icon"
            aria-label="검색"
            className="md:hidden"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>

          <ThemeToggle />

          {user ? (
            <>
              <NotificationBell />
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/profile/${user.nickname}`} className="flex items-center gap-2">
                  {user.profileImageUrl ? (
                    <Image
                      src={user.profileImageUrl}
                      alt={user.nickname}
                      width={24}
                      height={24}
                      className="rounded-md object-cover"
                    />
                  ) : null}
                  {user.nickname}
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? '...' : '로그아웃'}
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
      </div>

      {/* 상단 GNB (데스크톱/태블릿). 모바일에서는 햄버거 버튼 → MobileDrawer를 사용한다. */}
      <div className="hidden border-t border-border-hairline md:block">
        <div className="mx-auto w-full max-w-[1280px] px-2">
          <Navigation />
        </div>
      </div>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* 모바일 검색 오버레이 - 헤더에 검색창이 숨겨지는 좁은 화면에서 검색 아이콘으로 연다. */}
      {searchOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSearchOpen(false)} />
          <div className="absolute inset-x-0 top-0 border-b border-border-hairline bg-bg-surface p-3">
            <form
              onSubmit={(e) => {
                handleSearchSubmit(e);
                setSearchOpen(false);
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="게시글, 태그, 회원 검색"
                  className="pl-9"
                />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSearchOpen(false)}>
                닫기
              </Button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
