'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createComment, updateComment, deleteComment } from '../api/comments.api';

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string }) =>
      createComment(postId, content, parentId),
    onSuccess: (_comment, variables) => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] }); // commentCount 갱신 반영
      if (variables.parentId) {
        queryClient.invalidateQueries({ queryKey: ['replies', variables.parentId] });
        queryClient.invalidateQueries({ queryKey: ['comments', postId] }); // 부모의 replyCount 갱신
      } else {
        queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      }
    },
  });
}

export function useUpdateComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      updateComment(commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['replies'] });
    },
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['replies'] });
    },
  });
}
