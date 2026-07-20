'use client';

import { usePosts } from '@/features/posts/hooks/usePosts';
import { PostList } from '@/components/post/PostList';

export function TagView({ slug }: { slug: string }) {
  const tag = decodeURIComponent(slug);
  const { data, isLoading, isError } = usePosts({ tag, limit: 20 });

  return (
    <>
      <h1 className="font-display text-xl font-semibold text-text-primary">
        <span className="text-text-muted">#</span>
        {tag}
      </h1>
      <PostList items={data?.items} isLoading={isLoading} isError={isError} />
    </>
  );
}
