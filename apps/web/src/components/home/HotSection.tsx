'use client';

import { useRankingPosts } from '@/features/posts/hooks/useRankingPosts';
import { PostList } from '@/components/post/PostList';
import { HomeSection } from './HomeSection';

/** HOT - 시간 가중치 랭킹(일간) 상위 게시글. 게시판이 아니라 집계 결과. */
export function HotSection() {
  const { data, isLoading, isError } = useRankingPosts({ type: 'hot', period: 'daily', limit: 5 });
  return (
    <HomeSection title="HOT" icon="🔥" moreHref="/hot">
      <PostList items={data} isLoading={isLoading} isError={isError} emptyMessage="아직 인기글이 없습니다." />
    </HomeSection>
  );
}
