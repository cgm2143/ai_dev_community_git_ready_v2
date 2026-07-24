import { api } from '@/lib/api-client';
import type { PaginatedResponse } from '@/features/posts/api/posts.api';

export function addBookmark(postId: string) {
  return api.post<void>(`/posts/${postId}/bookmark`);
}

export function removeBookmark(postId: string) {
  return api.delete<void>(`/posts/${postId}/bookmark`);
}

/** 내가 북마크한 게시글 응답(백엔드 BookmarkedPostResponseDto). 게시글 식별자는 postId로 내려온다. */
export interface BookmarkedPost {
  postId: string;
  title: string;
  excerpt: string;
  boardName: string;
  boardSlug: string;
  authorNickname: string;
  authorProfileImageUrl: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  bookmarkedAt: string;
  createdAt: string;
}

/** 내가 저장(북마크)한 글 목록. 인증 사용자 기준(GET /bookmarks). */
export function getMyBookmarks(page = 1, limit = 20) {
  return api.get<PaginatedResponse<BookmarkedPost>>(`/bookmarks?page=${page}&limit=${limit}`);
}
