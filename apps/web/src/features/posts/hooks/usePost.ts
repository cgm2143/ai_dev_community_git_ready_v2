'use client';

import { useQuery } from '@tanstack/react-query';
import { getPost } from '../api/posts.api';

export function usePost(id: string) {
  return useQuery({
    queryKey: ['post', id],
    queryFn: () => getPost(id),
    enabled: Boolean(id),
  });
}
