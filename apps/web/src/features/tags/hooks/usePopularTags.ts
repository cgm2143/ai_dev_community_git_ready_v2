'use client';

import { useQuery } from '@tanstack/react-query';
import { getPopularTags } from '../api/tags.api';

export function usePopularTags(limit = 30) {
  return useQuery({
    queryKey: ['popular-tags', limit],
    queryFn: () => getPopularTags(limit),
    staleTime: 5 * 60 * 1000,
  });
}
