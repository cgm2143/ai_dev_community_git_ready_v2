'use client';

import { useQuery } from '@tanstack/react-query';
import { getPosts, type QueryPostsParams } from '../api/posts.api';

export function usePosts(params: QueryPostsParams = {}) {
  return useQuery({
    queryKey: ['posts', params],
    queryFn: () => getPosts(params),
  });
}
