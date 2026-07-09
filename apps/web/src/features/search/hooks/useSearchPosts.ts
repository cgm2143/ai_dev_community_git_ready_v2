'use client';

import { useQuery } from '@tanstack/react-query';
import { searchPosts, type SearchPostsParams } from '../api/search.api';

export function useSearchPosts(params: SearchPostsParams) {
  return useQuery({
    queryKey: ['search-posts', params],
    queryFn: () => searchPosts(params),
    enabled: params.q.trim().length > 0,
  });
}
