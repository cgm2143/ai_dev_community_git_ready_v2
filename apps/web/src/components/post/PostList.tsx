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
  /** true면 카드를 세로 리스트가 아니라 2열 그리드로 배치한다(카드 폭 절반, 예: HOT 2x2). */
  grid?: boolean;
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
  grid,
}: PostListProps) {
  const containerClass = grid ? 'grid grid-cols-1 gap-3 sm:grid-cols-2' : 'flex flex-col gap-3';

  if (isLoading) {
    return (
      <div className={containerClass}>
        {Array.from({ length: grid ? 4 : 5 }).map((_, i) => (
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
    <div className={containerClass}>
      {items.map((post) => (
        <PostCard key={post.id} post={post} hot={hot} />
      ))}
    </div>
  );
}
