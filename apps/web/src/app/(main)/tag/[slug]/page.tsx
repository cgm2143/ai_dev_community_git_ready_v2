'use client';

import { usePosts } from '@/features/posts/hooks/usePosts';
import { PostList } from '@/components/post/PostList';

/**
 * 태그 중심 탐색 페이지. 게시판이 아니라 태그(#slug)로 전체 게시글을 가로질러 모아 본다.
 * 태그별 게시글은 기존 GET /posts?tag= 필터를 재사용한다.
 */
export default function TagPage({ params }: { params: { slug: string } }) {
  const tag = decodeURIComponent(params.slug);
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
