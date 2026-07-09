import Link from 'next/link';
import { MessageSquare, ThumbsUp, Eye } from 'lucide-react';
import { ActivityPulseBar } from './ActivityPulseBar';
import type { PostListItem } from '@/features/posts/api/posts.api';

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

export function PostCard({ post }: { post: PostListItem }) {
  return (
    <Link
      href={`/boards/${post.boardSlug}/${post.id}`}
      className="flex gap-3 rounded-card border border-border-hairline bg-bg-surface p-4 transition-colors hover:bg-bg-surface-muted"
    >
      <ActivityPulseBar likeCount={post.likeCount} commentCount={post.commentCount} viewCount={post.viewCount} />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="rounded bg-accent-primary-tint px-1.5 py-0.5 font-medium text-accent-primary-strong">
            {post.boardName}
          </span>
          {post.isNotice && (
            <span className="rounded bg-accent-amber/15 px-1.5 py-0.5 font-medium text-accent-amber">공지</span>
          )}
        </div>

        <h3 className="truncate font-display text-base font-semibold text-text-primary">{post.title}</h3>
        <p className="line-clamp-2 text-sm text-text-secondary">{post.excerpt}</p>

        <div className="mt-1 flex items-center gap-3 font-mono text-xs text-text-muted">
          <span>{post.authorNickname}</span>
          <span>·</span>
          <span>{formatRelativeTime(post.createdAt)}</span>
          <span className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-3.5 w-3.5" /> {post.likeCount}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> {post.commentCount}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> {post.viewCount}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
