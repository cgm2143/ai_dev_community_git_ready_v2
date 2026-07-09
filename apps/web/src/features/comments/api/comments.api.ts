import { api } from '@/lib/api-client';
import type { PaginatedResponse } from '@/features/posts/api/posts.api';

export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: string;
  authorNickname: string;
  authorProfileImageUrl: string | null;
  content: string;
  isDeleted: boolean;
  likeCount: number;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

export function getTopLevelComments(postId: string, page = 1, limit = 20) {
  return api.get<PaginatedResponse<Comment>>(`/posts/${postId}/comments?page=${page}&limit=${limit}`);
}

export function getReplies(commentId: string) {
  return api.get<Comment[]>(`/comments/${commentId}/replies`);
}

export function createComment(postId: string, content: string, parentId?: string) {
  return api.post<Comment>(`/posts/${postId}/comments`, { content, parentId });
}

export function updateComment(commentId: string, content: string) {
  return api.patch<Comment>(`/comments/${commentId}`, { content });
}

export function deleteComment(commentId: string) {
  return api.delete<void>(`/comments/${commentId}`);
}
