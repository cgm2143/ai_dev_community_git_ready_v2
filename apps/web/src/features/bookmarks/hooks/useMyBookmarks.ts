'use client';

import { useQuery } from '@tanstack/react-query';
import { getMyBookmarks } from '../api/bookmarks.api';

/** 내가 저장(북마크)한 글 목록. enabled=false면 조회하지 않는다(예: 남의 프로필). */
export function useMyBookmarks(enabled = true) {
  return useQuery({
    queryKey: ['my-bookmarks'],
    queryFn: () => getMyBookmarks(),
    enabled,
  });
}
