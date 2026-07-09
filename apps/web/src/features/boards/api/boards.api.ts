import { api } from '@/lib/api-client';
import type { PaginatedResponse, PostListItem, QueryPostsParams } from '@/features/posts/api/posts.api';

export interface BoardSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface CategoryWithBoards {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  boards: BoardSummary[];
}

export function getCategories() {
  return api.get<CategoryWithBoards[]>('/categories');
}

export function getBoardBySlug(slug: string) {
  return api.get<BoardSummary>(`/boards/${slug}`);
}

export function getBoardPosts(slug: string, params: Omit<QueryPostsParams, 'boardId'> = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });
  const query = search.toString();
  return api.get<PaginatedResponse<PostListItem>>(`/boards/${slug}/posts${query ? `?${query}` : ''}`);
}
