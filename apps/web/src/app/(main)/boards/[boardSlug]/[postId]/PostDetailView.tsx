'use client';

import { usePost } from '@/features/posts/hooks/usePost';
import { PostDetail } from '@/components/post/PostDetail';
import { CommentList } from '@/components/comment/CommentList';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { AiSummaryCard } from '@/components/ai/AiSummaryCard';
import { RelatedPosts } from '@/components/post/RelatedPosts';

/** 게시글 상세 인터랙티브 본문(반응/댓글 등). 메타데이터/404는 서버 page.tsx가 담당한다. */
export function PostDetailView({ postId }: { postId: string }) {
  const { data: post, isLoading, isError } = usePost(postId);

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-card bg-bg-surface-muted" />;
  }

  if (isError || !post) {
    return (
      <p className="rounded-card border border-border-hairline bg-bg-surface p-6 text-center text-sm text-text-secondary">
        게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: post.boardName, href: `/boards/${post.boardSlug}` }]} />
      <AiSummaryCard postId={post.id} />
      <PostDetail post={post} />
      <RelatedPosts postId={post.id} />
      <CommentList postId={post.id} />
    </div>
  );
}
