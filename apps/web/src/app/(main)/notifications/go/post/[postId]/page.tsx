'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { usePost } from '@/features/posts/hooks/usePost';

/**
 * 알림에는 postId만 있고 boardSlug가 없어(백엔드 Notification.targetId는 postId만 저장),
 * 게시글 상세 URL(/boards/:boardSlug/:postId)을 바로 알 수 없다. 이 페이지가 게시글을 조회해
 * boardSlug를 알아낸 뒤 최종 URL로 치환(replace)한다.
 */
export default function NotificationRedirectPage({ params }: { params: { postId: string } }) {
  const router = useRouter();
  const { data: post, isError } = usePost(params.postId);

  React.useEffect(() => {
    if (post) {
      router.replace(`/boards/${post.boardSlug}/${post.id}`);
    }
  }, [post, router]);

  if (isError) {
    return <p className="text-sm text-text-secondary">게시글을 찾을 수 없습니다. 삭제되었을 수 있습니다.</p>;
  }

  return <div className="h-24 animate-pulse rounded-card bg-bg-surface-muted" />;
}
