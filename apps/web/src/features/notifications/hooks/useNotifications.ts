'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  type AppNotification,
} from '../api/notifications.api';
import { connectNotificationSocket, disconnectNotificationSocket } from '@/lib/websocket-client';
import { useAuthStore } from '@/stores/auth-store';

export function useNotifications(unreadOnly = false, enabled = true) {
  return useQuery({
    queryKey: ['notifications', unreadOnly],
    queryFn: () => getNotifications(1, 20, unreadOnly),
    enabled,
  });
}

export function useNotificationMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const markAsRead = useMutation({ mutationFn: markNotificationAsRead, onSuccess: invalidate });
  const markAllAsRead = useMutation({ mutationFn: markAllNotificationsAsRead, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: deleteNotification, onSuccess: invalidate });

  return { markAsRead, markAllAsRead, remove };
}

/**
 * 로그인 상태일 때 WebSocket에 연결해 notification:new 이벤트를 구독한다.
 * 새 알림이 오면 목록 쿼리를 무효화해 다시 불러온다 - 백엔드가 Redis Pub/Sub으로
 * 브로드캐스트한 알림이 이 소켓을 통해 실시간으로 도착한다(8단계 NotificationsGateway).
 */
export function useNotificationSocket() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!user) return undefined;

    const socket = connectNotificationSocket();
    if (!socket) return undefined;

    const handleNewNotification = (_notification: AppNotification) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
      disconnectNotificationSocket();
    };
  }, [user, queryClient]);
}
