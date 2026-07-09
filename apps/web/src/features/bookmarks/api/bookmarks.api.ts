import { api } from '@/lib/api-client';

export function addBookmark(postId: string) {
  return api.post<void>(`/posts/${postId}/bookmark`);
}

export function removeBookmark(postId: string) {
  return api.delete<void>(`/posts/${postId}/bookmark`);
}
