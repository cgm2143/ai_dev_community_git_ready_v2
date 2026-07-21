'use client';

import { useRelatedPosts } from '@/features/posts/hooks/useRelatedPosts';
import { PostCard } from '@/components/post/PostCard';

/**
 * 게시글 하단 "연관 게시글" 섹션(AI 요약 아래·댓글 위). 결과가 없으면 섹션을 숨긴다.
 * 기존 PostCard를 그대로 재사용한다.
 */
export function RelatedPosts({ postId }: { postId: string }) {
  const { data } = useRelatedPosts(postId);

  if (!data || data.length === 0) return null;

  return (
    <section aria-label="연관 게시글" className="flex flex-col gap-3">
      <h2 className="font-display text-base font-semibold text-text-primary">연관 게시글</h2>
      <div className="flex flex-col gap-2">
        {data.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
