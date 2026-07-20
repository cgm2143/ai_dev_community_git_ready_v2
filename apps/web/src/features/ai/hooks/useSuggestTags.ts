'use client';

import { useMutation } from '@tanstack/react-query';
import { suggestTags, type SuggestTagsResponse } from '../api/ai.api';

/** AI 태그 추천 mutation. 성공 시 추천 태그 목록을 반환하며, 적용 여부는 사용자가 결정한다. */
export function useSuggestTags() {
  return useMutation<SuggestTagsResponse, unknown, { title: string; content: string }>({
    mutationFn: suggestTags,
  });
}
