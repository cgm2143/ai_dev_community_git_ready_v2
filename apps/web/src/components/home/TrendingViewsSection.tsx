'use client';

import { useRankingPosts } from '@/features/posts/hooks/useRankingPosts';
import { RankedPostList } from './RankedPostList';
import { HomeSection } from './HomeSection';

/** 지금 많이 보는 글 - 최근(일간) 조회수 기준. */
export function TrendingViewsSection() {
  const { data, isLoading } = useRankingPosts({ type: 'views', period: 'daily', limit: 10 });
  return (
    <HomeSection title="지금 많이 보는 글" icon="👀">
      <RankedPostList items={data} isLoading={isLoading} />
    </HomeSection>
  );
}
