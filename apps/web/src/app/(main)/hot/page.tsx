'use client';

import { usePosts } from '@/features/posts/hooks/usePosts';
import { PostList } from '@/components/post/PostList';

/**
 * 🔥 HOT - 전체 게시글 중 인기순(반응/조회 기반, 백엔드 sort=popular)으로 모아 보여주는 특수 피드.
 * 특정 카테고리가 아니라 사이트 전체의 인기 글을 집계한다.
 */
export default function HotPage() {
  const { data, isLoading, isError } = usePosts({ sort: 'popular', limit: 20 });

  return (
    <>
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-xl">
          🔥
        </span>
        <h1 className="font-display text-xl font-semibold text-text-primary">인기글</h1>
      </div>

      <PostList items={data?.items} isLoading={isLoading} isError={isError} />
    </>
  );
}
