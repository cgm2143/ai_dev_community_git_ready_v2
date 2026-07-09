'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reactToPost, reactToComment } from '../api/reactions.api';

export function useReactToPost(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (type: 'LIKE' | 'DISLIKE') => reactToPost(postId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}

export function useReactToComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => reactToComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['replies'] });
    },
  });
}
