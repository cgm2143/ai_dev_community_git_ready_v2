'use client';

import { HotSection } from '@/components/home/HotSection';
import { RealtimePopularSection } from '@/components/home/RealtimePopularSection';
import { TrendingViewsSection } from '@/components/home/TrendingViewsSection';
import { CategoryLatestSection } from '@/components/home/CategoryLatestSection';
import { AiRecommendSection } from '@/components/home/AiRecommendSection';
import { HubSection } from '@/components/home/HubSection';
import { FEATURE_HUBS } from '@/features/home/hubs';

/**
 * 종합 커뮤니티 메인. 광고/이벤트 중심을 걷어내고 콘텐츠 섹션형으로 재구성했다.
 * 순서: HOT → 실시간 인기 → 지금 많이 보는 글 → 카테고리별 최신글 → AI 추천(Placeholder)
 *       → Labs → 챌린지 → 리뷰 → AMA (콘텐츠 허브, Post+Tag 기반 Feature View).
 */
export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <HotSection />
      <RealtimePopularSection />
      <TrendingViewsSection />
      <CategoryLatestSection />
      <AiRecommendSection />
      {FEATURE_HUBS.map((hub) => (
        <HubSection key={hub.key} hub={hub} />
      ))}
    </div>
  );
}
