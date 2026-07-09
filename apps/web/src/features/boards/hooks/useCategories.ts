'use client';

import { useQuery } from '@tanstack/react-query';
import { getCategories } from '../api/boards.api';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 60 * 1000, // 백엔드가 60초 캐싱하므로 프론트도 그와 맞춰 불필요한 재조회를 줄인다.
  });
}
