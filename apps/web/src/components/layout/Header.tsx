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
      {/*
        단일 상단 바: [로고(좌)] · [메뉴(정중앙)] · [액션(우)].
        grid-cols-[1fr_auto_1fr]로 좌/우 컬럼 폭을 동일하게 잡아, 가운데 메뉴가 뷰포트 정중앙에 오게 한다
        (좌우 콘텐츠 폭이 달라도 중앙 정렬이 흔들리지 않는다). 모바일은 햄버거 → MobileDrawer.
      */}
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-3 px-4 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        {/* 좌: 모바일 햄버거 + 로고 */}
        <div className="flex items-center gap-2 justify-self-start">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="메뉴 열기"
            className="-ml-1 rounded-md p-1.5 text-text-secondary hover:bg-bg-surface-muted lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Logo />
        </div>

        {/* 중앙: 데스크톱(lg+) GNB(정중앙). 모바일·태블릿(<lg)은 햄버거 메뉴를 사용해
            좁은 폭에서 로고/메뉴/액션이 한 줄에 몰려 정중앙 정렬이 깨지는 것을 방지한다. */}
        <div className="hidden justify-self-center lg:block">
          <Navigation />
        </div>

        {/* 우: 검색 아이콘 + 테마 + 알림 + 프로필/로그인 */}
        <div className="flex items-center gap-1.5 justify-self-end">
          <Button variant="ghost" size="icon" aria-label="검색" onClick={() => setSearchOpen(true)}>
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
                  <span className="hidden sm:inline">{user.nickname}</span>
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

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* 검색 오버레이 - 모든 화면에서 검색 아이콘으로 연다(기존 검색 기능/라우팅 그대로). */}
      {searchOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSearchOpen(false)} />
          <div className="absolute inset-x-0 top-0 border-b border-border-hairline bg-bg-surface p-3">
            <form
              onSubmit={(e) => {
                handleSearchSubmit(e);
                setSearchOpen(false);
              }}
              className="mx-auto flex w-full max-w-[1600px] items-center gap-2 px-1"
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
