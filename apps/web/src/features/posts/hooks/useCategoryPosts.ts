'use client';

import { useQuery } from '@tanstack/react-query';
import { getPosts } from '../api/posts.api';

/** 특정 카테고리(대분류)의 최신 게시글. 메인 "카테고리별 최신글"에서 사용. */
export function useCategoryPosts(category: string, limit = 5) {
  return useQuery({
    queryKey: ['posts', { category, limit, sort: 'latest' }],
    queryFn: () => getPosts({ category, limit, sort: 'latest' }),
    enabled: Boolean(category),
    staleTime: 60 * 1000,
  });
}
