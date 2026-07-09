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
  keyword?: string;
  sort?: 'latest' | 'popular';
  page?: number;
  limit?: number;
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
