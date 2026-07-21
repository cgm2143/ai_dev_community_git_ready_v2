'use client';

import { useQuery } from '@tanstack/react-query';
import { getRelatedPosts } from '../api/posts.api';

/** 연관 게시글 조회. 결과는 서버(Redis)에서 캐싱되므로 클라이언트는 짧게 신선도만 유지한다. */
export function useRelatedPosts(postId: string) {
  return useQuery({
    queryKey: ['posts', 'related', postId],
    queryFn: () => getRelatedPosts(postId),
    staleTime: 60_000,
  });
}
