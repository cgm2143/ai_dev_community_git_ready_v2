import { PostCard } from './PostCard';
import { EmptyState, type EmptyStateAction } from '@/components/common/EmptyState';
import type { PostListItem } from '@/features/posts/api/posts.api';

interface PostListProps {
  items: PostListItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
  emptyMessage?: string;
  errorMessage?: string;
  emptyActions?: EmptyStateAction[];
  /** 목록의 카드에 HOT 배지를 강제 표시(예: HOT 섹션). */
  hot?: boolean;
}

const DEFAULT_EMPTY_ACTIONS: EmptyStateAction[] = [
  { label: '첫 글 작성하기', href: '/write' },
  { label: '인기글 보기', href: '/hot' },
  { label: '다른 게시판 둘러보기', href: '/' },
];

export function PostList({
  items,
  isLoading,
  isError,
  emptyMessage = '아직 게시글이 없습니다.',
  errorMessage = '게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
  emptyActions = DEFAULT_EMPTY_ACTIONS,
  hot,
}: PostListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-card bg-bg-surface-muted" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="rounded-card border border-border-hairline bg-bg-surface p-6 text-center text-sm text-text-secondary">
        {errorMessage}
      </p>
    );
  }

  if (!items || items.length === 0) {
    return <EmptyState message={emptyMessage} actions={emptyActions} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((post) => (
        <PostCard key={post.id} post={post} hot={hot} />
      ))}
    </div>
  );
}
