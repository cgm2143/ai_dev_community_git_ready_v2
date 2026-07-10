'use client';

import { PostEditor } from '@/components/post/PostEditor';
import { useCreatePost } from '@/features/posts/hooks/useCreatePost';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';

export default function WritePostPage() {
  const { isChecking } = useRequireAuth();
  const createMutation = useCreatePost();

  if (isChecking) {
    return <div className="h-64 animate-pulse rounded-card bg-bg-surface-muted" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-xl font-semibold text-text-primary">글쓰기</h1>
      <PostEditor
        submitLabel="게시글 등록"
        isSubmitting={createMutation.isPending}
        error={createMutation.error}
        onSubmit={(values) => createMutation.mutate(values)}
      />
    </div>
  );
}
