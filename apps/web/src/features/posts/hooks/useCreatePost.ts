'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createPost } from '../api/posts.api';

export function useCreatePost() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPost,
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      router.push(`/boards/${post.boardSlug}/${post.id}`);
    },
  });
}
