'use client';

import { useQuery } from '@tanstack/react-query';
import { getPosts } from '@/features/posts/api/posts.api';

/** 허브 태그들(OR)로 모은 게시글. 태그가 하나도 없으면 조회하지 않는다. */
export function useHubPosts(tags: string[], limit = 6) {
  const tagsParam = tags.join(',');
  return useQuery({
    queryKey: ['hub-posts', { tagsParam, limit }],
    queryFn: () => getPosts({ tags: tagsParam, limit, sort: 'latest' }),
    enabled: tags.length > 0,
    staleTime: 60 * 1000,
  });
}
