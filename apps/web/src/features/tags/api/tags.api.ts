import { api } from '@/lib/api-client';

export interface PopularTag {
  name: string;
  usageCount: number;
}

/** 인기 태그 목록 (usageCount 내림차순). */
export function getPopularTags(limit = 30) {
  return api.get<PopularTag[]>(`/tags?limit=${limit}`);
}
