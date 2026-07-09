'use client';

import { useQuery } from '@tanstack/react-query';
import { getBoardBySlug, getBoardPosts } from '../api/boards.api';
import type { QueryPostsParams } from '@/features/posts/api/posts.api';

export function useBoard(slug: string) {
  return useQuery({
    queryKey: ['board', slug],
    queryFn: () => getBoardBySlug(slug),
    enabled: Boolean(slug),
  });
}

export function useBoardPosts(slug: string, params: Omit<QueryPostsParams, 'boardId'> = {}) {
  return useQuery({
    queryKey: ['board-posts', slug, params],
    queryFn: () => getBoardPosts(slug, params),
    enabled: Boolean(slug),
  });
}
