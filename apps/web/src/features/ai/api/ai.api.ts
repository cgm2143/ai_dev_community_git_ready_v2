import { api } from '@/lib/api-client';

export type SummaryStatus = 'ready' | 'pending' | 'unavailable';

export interface PostSummaryResponse {
  status: SummaryStatus;
  summary?: string;
}

/** AI 요약 조회. 없으면 서버가 생성 작업만 등록하고 status=pending을 반환한다(프론트는 polling). */
export function getPostSummary(postId: string): Promise<PostSummaryResponse> {
  return api.get<PostSummaryResponse>(`/ai/posts/${postId}/summary`);
}

export interface SuggestTagsResponse {
  tags: string[];
}

/** 제목+본문으로 태그 추천을 요청한다. 저장은 하지 않으며 사용자가 선택해서 적용한다. */
export function suggestTags(body: { title: string; content: string }): Promise<SuggestTagsResponse> {
  return api.post<SuggestTagsResponse>('/ai/suggest-tags', body);
}
