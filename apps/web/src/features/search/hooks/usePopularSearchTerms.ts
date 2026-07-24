'use client';

import { useQuery } from '@tanstack/react-query';
import { getPopularSearchTerms } from '../api/search.api';

/** 인기 검색어 목록. 검색 로그(Redis)가 갱신되므로 짧게 캐싱한다. */
export function usePopularSearchTerms() {
  return useQuery({
    queryKey: ['popular-search-terms'],
    queryFn: getPopularSearchTerms,
    staleTime: 60 * 1000,
  });
}
