import { api } from '@/lib/api-client';

export interface PostListItem {
  id: string;
  boardId: string;
  boardName: string;
  boardSlug: string;
  authorId: string;
  authorNickname: string;
  authorProfileImageUrl: string | null;
  title: string;
  excerpt: string;
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  isNotice: boolean;
  tags: string[];
  createdAt: string;
}

export interface PostAttachment {
  id: string;
  fileUrl: string;
  fileType: string;
}

export interface PostDetail extends PostListItem {
  content: string;
  contentHtml: string;
  attachments: PostAttachment[];
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: { page: number; limit: number; total: number };
}

export interface QueryPostsParams {
  boardId?: string;
  tag?: string;
  /** 여러 태그 OR (콤마 구분). Feature Hub용. */
  tags?: string;
  /** 카테고리 slug 필터 */
  category?: string;
  keyword?: string;
  sort?: 'latest' | 'popular';
  page?: number;
  limit?: number;
}

export type RankingType = 'hot' | 'views' | 'comments' | 'likes';

export interface RankingParams {
  type?: RankingType;
  period?: 'daily' | 'weekly' | 'monthly';
  limit?: number;
}

/** 범용 랭킹 조회. type=hot|views|comments|likes. 결과는 게시글 목록 배열(페이지네이션 없음). */
export function getRanking(params: RankingParams = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });
  const query = search.toString();
  return api.get<PostListItem[]>(`/posts/ranking${query ? `?${query}` : ''}`);
}

export function getPosts(params: QueryPostsParams = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });
  const query = search.toString();
  return api.get<PaginatedResponse<PostListItem>>(`/posts${query ? `?${query}` : ''}`);
}

export function getPost(id: string) {
  return api.get<PostDetail>(`/posts/${id}`);
}

export interface CreatePostPayload {
  boardId: string;
  title: string;
  content: string;
  tags?: string[];
  attachmentIds?: string[];
}

export function createPost(payload: CreatePostPayload) {
  return api.post<PostDetail>('/posts', payload);
}

export interface UpdatePostPayload {
  boardId?: string;
  title?: string;
  content?: string;
  tags?: string[];
  attachmentIds?: string[];
}

export function updatePost(id: string, payload: UpdatePostPayload) {
  return api.patch<PostDetail>(`/posts/${id}`, payload);
}

export function deletePost(id: string) {
  return api.delete<void>(`/posts/${id}`);
}
