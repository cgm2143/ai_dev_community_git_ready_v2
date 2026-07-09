'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { updatePost, deletePost, type UpdatePostPayload } from '../api/posts.api';

export function useUpdatePost(postId: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePostPayload) => updatePost(postId, payload),
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      router.push(`/boards/${post.boardSlug}/${post.id}`);
    },
  });
}

export function useDeletePost(postId: string, boardSlug: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      router.push(`/boards/${boardSlug}`);
    },
  });
}
