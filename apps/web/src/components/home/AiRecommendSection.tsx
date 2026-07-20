'use client';

import { useRankingPosts } from '@/features/posts/hooks/useRankingPosts';
import { PostList } from '@/components/post/PostList';
import { HomeSection } from './HomeSection';

/**
 * AI 추천 (Placeholder). UI는 준비 중 배지로 표시하되, 데이터는 기존 HOT(주간)을 재사용한다.
 * 향후 실제 AI 추천 API가 생기면 useRankingPosts 호출만 useAiRecommendations로 교체하면 된다.
 */
export function AiRecommendSection() {
  const { data, isLoading, isError } = useRankingPosts({ type: 'hot', period: 'weekly', limit: 5 });

  return (
    <HomeSection title="AI 추천" icon="✨">
      <div className="mb-2 flex items-center gap-2 rounded-md border border-dashed border-accent-primary/40 bg-accent-primary-tint/40 px-3 py-2 text-xs text-text-secondary">
        <span className="rounded bg-accent-primary-strong px-1.5 py-0.5 text-[10px] font-semibold text-white">BETA</span>
        AI 추천은 준비 중입니다. 현재는 인기글 기반으로 임시 노출됩니다.
      </div>
      <PostList items={data} isLoading={isLoading} isError={isError} />
    </HomeSection>
  );
}
