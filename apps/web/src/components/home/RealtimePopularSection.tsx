'use client';

import { useRankingPosts } from '@/features/posts/hooks/useRankingPosts';
import { CompactPostList } from '@/components/post/CompactPostList';
import { HomeSection } from './HomeSection';

/** 실시간 인기 - 일간 랭킹을 번호 리스트로. */
export function RealtimePopularSection() {
  const { data, isLoading } = useRankingPosts({ type: 'hot', period: 'daily', limit: 10 });
  return (
    <HomeSection title="실시간 인기" icon="⚡" moreHref="/hot">
      <CompactPostList items={data} isLoading={isLoading} numbered emptyMessage="아직 인기글이 없습니다." />
    </HomeSection>
  );
}
