'use client';

import { useRankingPosts } from '@/features/posts/hooks/useRankingPosts';
import { CompactPostList } from '@/components/post/CompactPostList';
import { HomeSection } from './HomeSection';

/** 지금 많이 보는 글 - 최근(일간) 조회수 기준. */
export function TrendingViewsSection() {
  const { data, isLoading } = useRankingPosts({ type: 'views', period: 'daily', limit: 10 });
  return (
    <HomeSection title="지금 많이 보는 글" icon="👀">
      <CompactPostList items={data} isLoading={isLoading} numbered emptyMessage="아직 조회된 글이 없습니다." />
    </HomeSection>
  );
}
