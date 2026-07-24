import Link from 'next/link';
import { MessageSquare, ThumbsUp, Eye } from 'lucide-react';
import { ActivityPulseBar } from './ActivityPulseBar';
import type { PostListItem } from '@/features/posts/api/posts.api';

const HOT_LIKE_THRESHOLD = 10;
const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;

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

/**
 * 카드 전체를 클릭 가능하게 하되(제목 링크에 stretched-link 적용) 태그 칩은 그 위(z-10)에서
 * 독립적으로 /tag/[slug]로 이동할 수 있게 한다(중첩 anchor 회피).
 * hot prop이 주어지면 HOT 배지를 강제 표시하고, 없으면 추천수 임계값으로 추정한다.
 */
export function PostCard({ post, hot }: { post: PostListItem; hot?: boolean }) {
  const isNew = Date.now() - new Date(post.createdAt).getTime() < NEW_WINDOW_MS;
  const isHot = hot ?? post.likeCount >= HOT_LIKE_THRESHOLD;
  const tags = post.tags?.slice(0, 3) ?? [];

  return (
    <div className="relative flex gap-3 rounded-card border border-border-hairline bg-bg-surface p-4 transition-colors hover:bg-bg-surface-muted">
      <ActivityPulseBar likeCount={post.likeCount} commentCount={post.commentCount} viewCount={post.viewCount} />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
          <span className="rounded bg-accent-primary-tint px-1.5 py-0.5 font-medium text-accent-primary-strong">
            {post.boardName}
          </span>
          {post.isNotice && (
            <span className="rounded bg-accent-amber/15 px-1.5 py-0.5 font-medium text-accent-amber">공지</span>
          )}
          {isHot && <span className="rounded bg-accent-danger/15 px-1.5 py-0.5 font-semibold text-accent-danger">HOT</span>}
          {isNew && <span className="rounded bg-accent-ai-teal/15 px-1.5 py-0.5 font-semibold text-accent-ai-teal">NEW</span>}
        </div>

        <h3 className="truncate font-display text-base font-semibold text-text-primary">
          <Link href={`/boards/${post.boardSlug}/${post.id}`} className="after:absolute after:inset-0 after:content-['']">
            {post.title}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-text-secondary">{post.excerpt}</p>

        {tags.length > 0 && (
          <div className="relative z-10 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Link
                key={tag}
                href={`/tag/${encodeURIComponent(tag)}`}
                className="rounded-full bg-bg-surface-muted px-2 py-0.5 text-xs text-text-muted transition-colors hover:text-text-primary"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-1 flex items-center gap-3 font-mono text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            {post.authorProfileImageUrl ? (
              // 작성자 프로필 사진(닉네임 왼쪽). 다양한 외부 호스트가 올 수 있어 next/image의
              // 도메인 allowlist 제약/런타임 에러를 피하려 일반 img를 쓴다(작은 아바타라 최적화 이득 미미).
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.authorProfileImageUrl}
                alt=""
                className="h-[18px] w-[18px] shrink-0 rounded-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span
                aria-hidden
                className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-bg-surface-muted text-[9px] font-semibold text-text-secondary"
              >
                {post.authorNickname.charAt(0).toUpperCase()}
              </span>
            )}
            {post.authorNickname}
          </span>
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
    </div>
  );
}
