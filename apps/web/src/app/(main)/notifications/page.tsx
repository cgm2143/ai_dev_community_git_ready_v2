'use client';

import { useNotifications, useNotificationMutations } from '@/features/notifications/hooks/useNotifications';
import { NotificationList } from '@/components/notification/NotificationList';
import { Button } from '@/components/ui/button';

export default function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const { markAllAsRead } = useNotificationMutations();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-text-primary">
          알림 {data && (data.meta?.unreadCount ?? 0) > 0 && `(${data.meta?.unreadCount})`}
        </h1>
        <Button variant="ghost" size="sm" onClick={() => markAllAsRead.mutate()} disabled={markAllAsRead.isPending}>
          모두 읽음 처리
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-card bg-bg-surface-muted" />
          ))}
        </div>
      ) : (
        <NotificationList notifications={data?.items ?? []} />
      )}
    </div>
  );
}
