'use client';

import { usePost } from '@/features/posts/hooks/usePost';
import { PostDetail } from '@/components/post/PostDetail';
import { CommentList } from '@/components/comment/CommentList';

export default function PostDetailPage({ params }: { params: { postId: string } }) {
  const { data: post, isLoading, isError } = usePost(params.postId);

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-card bg-bg-surface-muted" />;
  }

  if (isError || !post) {
    return (
      <p className="rounded-card border border-border-hairline bg-bg-surface p-6 text-center text-sm text-text-secondary">
        게시글을 찾을 수 없습니다. 삭제되었거나 존재하지 않는 게시글입니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PostDetail post={post} />
      <CommentList postId={post.id} />
    </div>
  );
}
