'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPostSummary } from '../api/ai.api';

// pending 동안의 polling 간격(Exponential Backoff): 1s → 2s → 4s → 8s → 15s(이후 15s 유지).
const POLL_BACKOFF_MS = [1000, 2000, 4000, 8000, 15000];

/**
 * AI 요약 조회. status=pending인 동안 지수 백오프로 polling하고, ready/unavailable이 되면 즉시 종료한다.
 * 서버 부하를 줄이면서도 생성 초기에는 빠르게 완료를 감지한다.
 */
export function usePostSummary(postId: string) {
  const attemptRef = React.useRef(0);

  return useQuery({
    queryKey: ['ai', 'summary', postId],
    queryFn: () => getPostSummary(postId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status !== 'pending') {
        attemptRef.current = 0; // 완료되면 백오프 카운터 초기화 후 polling 종료
        return false;
      }
      const idx = Math.min(attemptRef.current, POLL_BACKOFF_MS.length - 1);
      attemptRef.current += 1;
      return POLL_BACKOFF_MS[idx];
    },
    staleTime: 0,
  });
}
