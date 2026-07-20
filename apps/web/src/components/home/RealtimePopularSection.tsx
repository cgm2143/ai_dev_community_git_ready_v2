'use client';

import { useRankingPosts } from '@/features/posts/hooks/useRankingPosts';
import { RankedPostList } from './RankedPostList';
import { HomeSection } from './HomeSection';

/** 실시간 인기 - 일간 랭킹을 번호 리스트로. */
export function RealtimePopularSection() {
  const { data, isLoading } = useRankingPosts({ type: 'hot', period: 'daily', limit: 10 });
  return (
    <HomeSection title="실시간 인기" icon="⚡" moreHref="/hot">
      <RankedPostList items={data} isLoading={isLoading} />
    </HomeSection>
  );
}
