'use client';

import * as React from 'react';
import { ThumbsUp, MessageSquare, Trash2 } from 'lucide-react';
import type { Comment } from '@/features/comments/api/comments.api';
import { useReplies } from '@/features/comments/hooks/useReplies';
import { useCreateComment, useDeleteComment } from '@/features/comments/hooks/useCommentMutations';
import { useReactToComment } from '@/features/reactions/hooks/useReactions';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { CommentForm } from './CommentForm';

function formatRelativeTime(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

export function CommentItem({ postId, comment }: { postId: string; comment: Comment }) {
  const [showReplies, setShowReplies] = React.useState(false);
  const [isReplying, setIsReplying] = React.useState(false);
  const currentUser = useAuthStore((state) => state.user);

  const repliesQuery = useReplies(comment.id, showReplies);
  const reactMutation = useReactToComment(postId);
  const createReplyMutation = useCreateComment(postId);
  const deleteMutation = useDeleteComment(postId);

  const isOwner = currentUser?.id === comment.authorId;

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="font-medium text-text-primary">{comment.authorNickname}</span>
            <span>{formatRelativeTime(comment.createdAt)}</span>
          </div>
          <p className={comment.isDeleted ? 'text-sm italic text-text-muted' : 'text-sm text-text-primary'}>
            {comment.content}
          </p>
        </div>

        {isOwner && !comment.isDeleted && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="댓글 삭제"
            onClick={() => deleteMutation.mutate(comment.id)}
          >
            <Trash2 className="h-3.5 w-3.5 text-text-muted" />
          </Button>
        )}
      </div>

      {!comment.isDeleted && (
        <div className="flex items-center gap-3 font-mono text-xs text-text-muted">
          <button
            type="button"
            onClick={() => reactMutation.mutate(comment.id)}
            className="flex items-center gap-1 hover:text-accent-primary-strong"
          >
            <ThumbsUp className="h-3.5 w-3.5" /> {comment.likeCount}
          </button>
          <button
            type="button"
            onClick={() => setIsReplying((prev) => !prev)}
            className="flex items-center gap-1 hover:text-accent-primary-strong"
          >
            <MessageSquare className="h-3.5 w-3.5" /> 답글
          </button>
          {comment.replyCount > 0 && (
            <button
              type="button"
              onClick={() => setShowReplies((prev) => !prev)}
              className="text-accent-primary-strong hover:underline"
            >
              {showReplies ? '답글 숨기기' : `답글 ${comment.replyCount}개 보기`}
            </button>
          )}
        </div>
      )}

      {isReplying && (
        <div className="ml-6">
          <CommentForm
            autoFocus
            placeholder={`${comment.authorNickname}님에게 답글 남기기`}
            submitLabel="답글 등록"
            isSubmitting={createReplyMutation.isPending}
            onCancel={() => setIsReplying(false)}
            onSubmit={(content) => {
              createReplyMutation.mutate(
                { content, parentId: comment.id },
                { onSuccess: () => setIsReplying(false) },
              );
              setShowReplies(true);
            }}
          />
        </div>
      )}

      {showReplies && (
        <div className="ml-6 flex flex-col divide-y divide-border-hairline border-l border-border-hairline pl-4">
          {repliesQuery.isLoading && <p className="py-2 text-xs text-text-muted">답글을 불러오는 중...</p>}
          {repliesQuery.data?.map((reply) => (
            <CommentItem key={reply.id} postId={postId} comment={reply} />
          ))}
        </div>
      )}
    </div>
  );
}
