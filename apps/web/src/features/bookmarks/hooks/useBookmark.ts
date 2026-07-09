'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { addBookmark, removeBookmark } from '../api/bookmarks.api';

/**
 * 게시글 상세 응답(PostDetailDto)에 "내가 북마크했는지" 필드가 없어(백엔드 6단계 설계),
 * 지금은 클라이언트 세션 내 로컬 상태로만 토글을 관리한다. 페이지를 새로고침하면
 * 초기값은 항상 false로 시작한다 - 정확한 초기 상태 동기화는 마이페이지 기능과 함께
 * 다음 턴에 연동할 예정이다.
 */
export function useBookmark(postId: string) {
  const [isBookmarked, setIsBookmarked] = React.useState(false);

  const mutation = useMutation({
    mutationFn: () => (isBookmarked ? removeBookmark(postId) : addBookmark(postId)),
    onSuccess: () => setIsBookmarked((prev) => !prev),
  });

  return { isBookmarked, toggle: () => mutation.mutate(), isPending: mutation.isPending };
}
