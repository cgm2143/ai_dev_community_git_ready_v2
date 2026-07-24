'use client';

import { useMyBookmarks } from '@/features/bookmarks/hooks/useMyBookmarks';
import { CompactPostList } from '@/components/post/CompactPostList';
import type { PostListItem } from '@/features/posts/api/posts.api';

/**
 * 프로필 화면의 "내가 저장한 글" 섹션. 본인 프로필에서만 렌더한다(북마크는 본인 것만 조회 가능).
 * 백엔드 GET /bookmarks 응답(postId 기반)을 CompactPostList가 쓰는 PostListItem 형태로 변환한다.
 */
export function BookmarksSection() {
  const { data, isLoading } = useMyBookmarks();

  const items: PostListItem[] = (data?.items ?? []).map((bookmark) => ({
    id: bookmark.postId,
    boardId: '',
    boardName: bookmark.boardName,
    boardSlug: bookmark.boardSlug,
    authorId: '',
    authorNickname: bookmark.authorNickname,
    authorProfileImageUrl: bookmark.authorProfileImageUrl,
    title: bookmark.title,
    excerpt: bookmark.excerpt,
    viewCount: bookmark.viewCount,
    likeCount: bookmark.likeCount,
    dislikeCount: 0,
    commentCount: bookmark.commentCount,
    isNotice: false,
    tags: [],
    createdAt: bookmark.createdAt,
  }));

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-semibold text-text-primary">내가 저장한 글</h2>
      <div className="rounded-card border border-border-hairline bg-bg-surface p-4">
        <CompactPostList items={items} isLoading={isLoading} emptyMessage="저장한 글이 없습니다." />
      </div>
    </section>
  );
}
