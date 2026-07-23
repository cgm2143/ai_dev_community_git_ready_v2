'use client';

import Link from 'next/link';
import { Trash2, MessageSquare, CornerDownRight, ThumbsUp, Megaphone, Flag, Bell, type LucideIcon } from 'lucide-react';
import type { AppNotification } from '@/features/notifications/api/notifications.api';
import { useNotificationMutations } from '@/features/notifications/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** 알림 타입별 아이콘 + 제목. 기존 enum(COMMENT/REPLY/LIKE/NOTICE/REPORT)에 표시만 매핑한다. */
const TYPE_META: Record<AppNotification['type'], { icon: LucideIcon; title: string }> = {
  COMMENT: { icon: MessageSquare, title: '새 댓글' },
  REPLY: { icon: CornerDownRight, title: '새 답글' },
  LIKE: { icon: ThumbsUp, title: '좋아요' },
  NOTICE: { icon: Megaphone, title: '공지' },
  REPORT: { icon: Flag, title: '신고 처리' },
};

function formatRelativeTime(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

/** POST 관련 알림은 게시글 상세로 이동하는 경량 리다이렉트 페이지를 거친다(boardSlug를 몰라도 되도록). */
function resolveLink(notification: AppNotification): string | null {
  if (notification.targetType === 'POST' && notification.targetId) {
    return `/notifications/go/post/${notification.targetId}`;
  }
  return null;
}

function NotificationItem({ notification }: { notification: AppNotification }) {
  const { markAsRead, remove } = useNotificationMutations();
  const href = resolveLink(notification);

  const meta = TYPE_META[notification.type] ?? { icon: Bell, title: '알림' };
  const Icon = meta.icon;

  const content = (
    <div
      className={cn(
        'flex items-start justify-between gap-3 rounded-card border border-border-hairline p-3',
        notification.isRead ? 'bg-bg-surface' : 'bg-accent-primary-tint/40',
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-surface-muted text-text-secondary"
          aria-hidden
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-text-primary">{meta.title}</span>
            {!notification.isRead && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-primary" aria-label="읽지 않음" />
            )}
          </div>
          <p className="text-sm text-text-secondary">
            {notification.message}
            {notification.groupCount > 1 && (
              <span className="ml-1 text-xs text-text-muted">외 {notification.groupCount - 1}건</span>
            )}
          </p>
          <span className="text-xs text-text-muted">{formatRelativeTime(notification.createdAt)}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="알림 삭제"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          remove.mutate(notification.id);
        }}
      >
        <Trash2 className="h-3.5 w-3.5 text-text-muted" />
      </Button>
    </div>
  );

  const handleClick = () => {
    if (!notification.isRead) markAsRead.mutate(notification.id);
  };

  if (href) {
    return (
      <Link href={href} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={handleClick} className="w-full text-left">
      {content}
    </button>
  );
}

export function NotificationList({ notifications }: { notifications: AppNotification[] }) {
  if (notifications.length === 0) {
    return (
      <p className="rounded-card border border-border-hairline bg-bg-surface p-6 text-center text-sm text-text-secondary">
        받은 알림이 없습니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
}
