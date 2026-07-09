'use client';

import { useQuery } from '@tanstack/react-query';
import { getReplies } from '../api/comments.api';

export function useReplies(commentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['replies', commentId],
    queryFn: () => getReplies(commentId),
    enabled,
  });
}
