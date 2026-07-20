'use client';

import { useQuery } from '@tanstack/react-query';
import { getPostSummary } from '../api/ai.api';

/**
 * AI 요약 조회. status=pending인 동안 3초 간격으로 polling하여 생성 완료를 감지한다.
 * ready/unavailable이 되면 polling을 멈춘다.
 */
export function usePostSummary(postId: string) {
  return useQuery({
    queryKey: ['ai', 'summary', postId],
    queryFn: () => getPostSummary(postId),
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 3000 : false),
    staleTime: 0,
  });
}
