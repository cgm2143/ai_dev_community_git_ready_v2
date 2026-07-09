'use client';

import { useQuery } from '@tanstack/react-query';
import { getTopLevelComments } from '../api/comments.api';

export function useComments(postId: string) {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: () => getTopLevelComments(postId),
    enabled: Boolean(postId),
  });
}
