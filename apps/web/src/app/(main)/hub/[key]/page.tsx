'use client';

import { findHub } from '@/features/home/hubs';
import { useHubPosts } from '@/features/home/hooks/useHubPosts';
import { PostList } from '@/components/post/PostList';

/** 콘텐츠 허브 전체보기 페이지. 허브 태그들로 모은 글을 페이지 단위로 보여준다. */
export default function HubPage({ params }: { params: { key: string } }) {
  const hub = findHub(params.key);
  const { data, isLoading, isError } = useHubPosts(hub?.tags ?? [], 20);

  if (!hub) {
    return <p className="text-sm text-text-muted">허브를 찾을 수 없습니다.</p>;
  }

  return (
    <>
      <div>
        <h1 className="flex items-center gap-2 font-display text-xl font-semibold text-text-primary">
          <span aria-hidden>{hub.icon}</span>
          {hub.title}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{hub.description}</p>
        <p className="mt-1 text-xs text-text-muted">태그: {hub.tags.join(', ')}</p>
      </div>
      <PostList items={data?.items} isLoading={isLoading} isError={isError} />
    </>
  );
}
