'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useNotifications, useNotificationMutations } from '@/features/notifications/hooks/useNotifications';
import { NotificationList } from '@/components/notification/NotificationList';
import { Button } from '@/components/ui/button';

/**
 * 헤더 알림 벨 + 드롭다운. 기존 자산을 그대로 재사용한다:
 * - 목록/개별읽음/이동/삭제는 NotificationList
 * - 조회(배지)·모두읽음은 useNotifications / useNotificationMutations
 * - API/모델/Worker/Queue는 전혀 건드리지 않는다.
 * 로그인 사용자에게만 렌더된다(Header에서 분기).
 */
export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const { data, isLoading } = useNotifications();
  const { markAllAsRead } = useNotificationMutations();
  const unreadCount = data?.meta?.unreadCount ?? 0;

  // 바깥 클릭 / ESC로 닫는다.
  React.useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // 알림 항목(링크)을 클릭해 이동하면 드롭다운을 닫는다. 삭제 버튼은 stopPropagation 하므로
  // 여기까지 이벤트가 올라오지 않아 패널이 유지된다.
  const handlePanelClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="알림"
        aria-expanded={open}
        className="relative"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-danger px-1 font-mono text-[10px] text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-border-hairline bg-bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border-hairline px-3 py-2">
            <span className="text-sm font-semibold text-text-primary">
              알림{unreadCount > 0 && ` (${unreadCount})`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending || unreadCount === 0}
            >
              모두 읽음
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto p-2" onClick={handlePanelClick}>
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-card bg-bg-surface-muted" />
                ))}
              </div>
            ) : (
              <NotificationList notifications={data?.items ?? []} />
            )}
          </div>

          <div className="border-t border-border-hairline px-3 py-2 text-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-sm text-accent-primary-strong hover:underline"
            >
              전체 보기
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
