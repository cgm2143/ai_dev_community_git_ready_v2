'use client';

import Link from 'next/link';
import { useComments } from '@/features/comments/hooks/useComments';
import { useCreateComment } from '@/features/comments/hooks/useCommentMutations';
import { useAuthStore } from '@/stores/auth-store';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';

export function CommentList({ postId }: { postId: string }) {
  const { data, isLoading } = useComments(postId);
  const createMutation = useCreateComment(postId);
  const user = useAuthStore((state) => state.user);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-semibold text-text-primary">댓글 {data?.meta.total ?? 0}개</h2>

      {isLoading && <p className="text-sm text-text-muted">댓글을 불러오는 중...</p>}

      <div className="flex flex-col gap-3">
        {data?.items.map((comment) => (
          <div
            key={comment.id}
            className="rounded-card border border-border-hairline bg-bg-surface p-4"
          >
            <CommentItem postId={postId} comment={comment} />
          </div>
        ))}
      </div>

      {data?.items.length === 0 && (
        <p className="py-4 text-center text-sm text-text-muted">첫 댓글을 남겨보세요.</p>
      )}

      {/* 작성 영역: 댓글 리스트 하단. 로그인 상태면 작성 폼, 아니면 로그인 안내(회색) 버튼. */}
      {user ? (
        <CommentForm
          isSubmitting={createMutation.isPending}
          onSubmit={(content) => createMutation.mutate({ content })}
        />
      ) : (
        <Link
          href="/login"
          className="block w-full rounded-md bg-bg-surface-muted px-4 py-3 text-center text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-raised hover:text-text-primary"
        >
          댓글을 작성하려면 로그인 해주세요.
        </Link>
      )}
    </section>
  );
}
