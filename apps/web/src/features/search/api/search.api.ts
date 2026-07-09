import { api } from '@/lib/api-client';
import type { PaginatedResponse, PostListItem } from '@/features/posts/api/posts.api';

export interface SearchPostsParams {
  q: string;
  page?: number;
  limit?: number;
}

export function searchPosts(params: SearchPostsParams) {
  const search = new URLSearchParams();
  search.set('q', params.q);
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  return api.get<PaginatedResponse<PostListItem>>(`/search/posts?${search.toString()}`);
}

export interface AutocompleteResult {
  posts: { id: string; title: string }[];
  tags: string[];
}

export function autocomplete(q: string) {
  return api.get<AutocompleteResult>(`/search/autocomplete?q=${encodeURIComponent(q)}`);
}
