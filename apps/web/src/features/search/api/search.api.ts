import { api } from '@/lib/api-client';
import type { PaginatedResponse, PostListItem } from '@/features/posts/api/posts.api';

/** 관련도(기본) | 최신순 | 조회순 | 추천순. */
export type SearchSort = 'relevance' | 'latest' | 'views' | 'likes';

export interface SearchPostsParams {
  q: string;
  categoryId?: string;
  boardId?: string;
  tag?: string;
  sort?: SearchSort;
  page?: number;
  limit?: number;
}

export function searchPosts(params: SearchPostsParams) {
  const search = new URLSearchParams();
  search.set('q', params.q);
  if (params.categoryId) search.set('categoryId', params.categoryId);
  if (params.boardId) search.set('boardId', params.boardId);
  if (params.tag) search.set('tag', params.tag);
  if (params.sort && params.sort !== 'relevance') search.set('sort', params.sort);
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

/** 인기 검색어(Redis ZSET 누적 집계). 검색 시 자동으로 집계된다(GET /search/popular). */
export interface PopularSearchTerm {
  term: string;
  score: number;
}

export function getPopularSearchTerms() {
  return api.get<PopularSearchTerm[]>('/search/popular');
}
