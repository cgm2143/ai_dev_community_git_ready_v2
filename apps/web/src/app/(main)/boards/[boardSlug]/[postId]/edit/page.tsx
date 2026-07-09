'use client';

import { usePost } from '@/features/posts/hooks/usePost';
import { useUpdatePost } from '@/features/posts/hooks/usePostMutations';
import { PostEditor } from '@/components/post/PostEditor';

export default function EditPostPage({ params }: { params: { postId: string } }) {
  const { data: post, isLoading } = usePost(params.postId);
  const updateMutation = useUpdatePost(params.postId);

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-card bg-bg-surface-muted" />;
  }

  if (!post) {
    return <p className="text-sm text-text-secondary">게시글을 찾을 수 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-xl font-semibold text-text-primary">게시글 수정</h1>
      <PostEditor
        submitLabel="수정 완료"
        isSubmitting={updateMutation.isPending}
        error={updateMutation.error}
        defaultValues={{
          boardId: post.boardId,
          title: post.title,
          content: post.content,
          tags: post.tags,
        }}
        onSubmit={(values) => updateMutation.mutate(values)}
      />
    </div>
  );
}
