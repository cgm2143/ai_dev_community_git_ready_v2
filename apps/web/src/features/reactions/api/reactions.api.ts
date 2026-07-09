import { api } from '@/lib/api-client';

export interface ReactionResult {
  active: boolean;
  type: 'LIKE' | 'DISLIKE' | null;
  likeCount: number;
  dislikeCount: number | null;
}

export function reactToPost(postId: string, type: 'LIKE' | 'DISLIKE') {
  return api.post<ReactionResult>(`/posts/${postId}/reactions`, { type });
}

export function reactToComment(commentId: string) {
  return api.post<ReactionResult>(`/comments/${commentId}/reactions`, { type: 'LIKE' });
}
