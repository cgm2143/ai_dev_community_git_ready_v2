'use client';

import { useComments } from '@/features/comments/hooks/useComments';
import { useCreateComment } from '@/features/comments/hooks/useCommentMutations';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';

export function CommentList({ postId }: { postId: string }) {
  const { data, isLoading } = useComments(postId);
  const createMutation = useCreateComment(postId);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-semibold text-text-primary">댓글 {data?.meta.total ?? 0}개</h2>

      <CommentForm
        isSubmitting={createMutation.isPending}
        onSubmit={(content) => createMutation.mutate({ content })}
      />

      {isLoading && <p className="text-sm text-text-muted">댓글을 불러오는 중...</p>}

      <div className="flex flex-col divide-y divide-border-hairline">
        {data?.items.map((comment) => (
          <CommentItem key={comment.id} postId={postId} comment={comment} />
        ))}
      </div>

      {data?.items.length === 0 && (
        <p className="py-4 text-center text-sm text-text-muted">첫 댓글을 남겨보세요.</p>
      )}
    </section>
  );
}
