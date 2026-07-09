import { api } from '@/lib/api-client';
import type { PaginatedResponse } from '@/features/posts/api/posts.api';

export interface AppNotification {
  id: string;
  type: 'COMMENT' | 'REPLY' | 'LIKE' | 'NOTICE' | 'REPORT';
  actorId: string | null;
  actorNickname: string | null;
  targetType: string | null;
  targetId: string | null;
  message: string;
  isRead: boolean;
  groupCount: number;
  createdAt: string;
}

export interface NotificationListResponse extends PaginatedResponse<AppNotification> {
  meta: { page: number; limit: number; total: number; unreadCount: number };
}

export function getNotifications(page = 1, limit = 20, unreadOnly = false) {
  const search = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (unreadOnly) search.set('unreadOnly', 'true');
  return api.get<NotificationListResponse>(`/notifications?${search.toString()}`);
}

export function markNotificationAsRead(id: string) {
  return api.patch<void>(`/notifications/${id}/read`);
}

export function markAllNotificationsAsRead() {
  return api.patch<void>('/notifications/read-all');
}

export function deleteNotification(id: string) {
  return api.delete<void>(`/notifications/${id}`);
}
