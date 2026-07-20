'use client';

import { useHubPosts } from '@/features/home/hooks/useHubPosts';
import { PostList } from '@/components/post/PostList';
import { HomeSection } from './HomeSection';
import type { FeatureHub } from '@/features/home/hubs';

/** 콘텐츠 허브(Labs/챌린지/리뷰/AMA) 섹션. 허브의 태그들로 모은 글을 보여준다. */
export function HubSection({ hub }: { hub: FeatureHub }) {
  const { data, isLoading, isError } = useHubPosts(hub.tags, 4);

  return (
    <HomeSection title={hub.title} icon={hub.icon} moreHref={`/hub/${hub.key}`}>
      <p className="-mt-1 mb-1 text-xs text-text-muted">{hub.description}</p>
      <PostList
        items={data?.items}
        isLoading={isLoading}
        isError={isError}
        emptyMessage={`아직 ${hub.title} 글이 없습니다. 관련 태그(${hub.tags.slice(0, 3).join(', ')})로 글을 올려보세요.`}
      />
    </HomeSection>
  );
}
