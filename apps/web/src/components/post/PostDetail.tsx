'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThumbsUp, ThumbsDown, Bookmark, Pencil, Trash2, Eye, Flag } from 'lucide-react';
import type { PostDetail as PostDetailType } from '@/features/posts/api/posts.api';
import { useReactToPost } from '@/features/reactions/hooks/useReactions';
import { useBookmark } from '@/features/bookmarks/hooks/useBookmark';
import { useDeletePost } from '@/features/posts/hooks/usePostMutations';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ReportModal } from '@/components/report/ReportModal';
import { cn } from '@/lib/utils';

export function PostDetail({ post }: { post: PostDetailType }) {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const reactMutation = useReactToPost(post.id);
  const bookmark = useBookmark(post.id);
  const deleteMutation = useDeletePost(post.id, post.boardSlug);
  const [reportOpen, setReportOpen] = React.useState(false);

  const isOwner = currentUser?.id === post.authorId;
  // 로그인한 사용자 중 작성자 본인이 아닐 때만 신고 버튼을 노출한다.
  const canReport = Boolean(currentUser) && !isOwner;

  const handleDelete = () => {
    if (window.confirm('게시글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      deleteMutation.mutate();
    }
  };

  return (
    <article className="flex flex-col gap-5">
      <header className="flex flex-col gap-2 border-b border-border-hairline pb-4">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Link
            href={`/boards/${post.boardSlug}`}
            className="rounded bg-accent-primary-tint px-1.5 py-0.5 font-medium text-accent-primary-strong"
          >
            {post.boardName}
          </Link>
          {post.isNotice && (
            <span className="rounded bg-accent-amber/15 px-1.5 py-0.5 font-medium text-accent-amber">공지</span>
          )}
        </div>

        <h1 className="font-display text-2xl font-semibold text-text-primary">{post.title}</h1>

        <div className="flex items-center justify-between font-mono text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-secondary">{post.authorNickname}</span>
            <span>{new Date(post.createdAt).toLocaleString('ko-KR')}</span>
          </div>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> {post.viewCount}
          </span>
        </div>

        {isOwner && (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => router.push(`/boards/${post.boardSlug}/${post.id}/edit`)}>
              <Pencil className="h-3.5 w-3.5" /> 수정
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleteMutation.isPending}>
              <Trash2 className="h-3.5 w-3.5" /> 삭제
            </Button>
          </div>
        )}
      </header>

      {/* contentHtml은 백엔드 MarkdownService(4단계)가 sanitize-html로 정화한 결과이므로 그대로 렌더링한다. */}
      <div
        className="prose prose-sm max-w-none text-text-primary [&_a]:text-accent-primary-strong [&_code]:font-mono [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-bg-surface-muted [&_pre]:p-3"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <Link
              key={tag}
              href={`/?tag=${encodeURIComponent(tag)}`}
              className="rounded-full bg-bg-surface-muted px-2.5 py-1 text-xs text-text-secondary hover:text-accent-primary-strong"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {post.attachments.length > 0 && (
        <div className="flex flex-col gap-2 rounded-card border border-border-hairline bg-bg-surface-muted p-3">
          <p className="text-xs font-medium text-text-secondary">첨부파일 {post.attachments.length}개</p>
          {post.attachments.map((attachment) => (
            <a
              key={attachment.id}
              href={attachment.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent-primary-strong hover:underline"
            >
              {attachment.fileUrl.split('/').pop()}
            </a>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-y border-border-hairline py-4">
        <Button
          variant="outline"
          className={cn(reactMutation.data?.type === 'LIKE' && 'border-accent-primary text-accent-primary-strong')}
          onClick={() => reactMutation.mutate('LIKE')}
        >
          <ThumbsUp className="h-4 w-4" /> 추천 {post.likeCount}
        </Button>
        <Button
          variant="outline"
          className={cn(reactMutation.data?.type === 'DISLIKE' && 'border-accent-danger text-accent-danger')}
          onClick={() => reactMutation.mutate('DISLIKE')}
        >
          <ThumbsDown className="h-4 w-4" /> 비추천 {post.dislikeCount}
        </Button>
        <Button
          variant="ghost"
          className={cn('ml-auto', bookmark.isBookmarked && 'text-accent-amber')}
          onClick={bookmark.toggle}
          disabled={bookmark.isPending}
        >
          <Bookmark className="h-4 w-4" /> 북마크
        </Button>
        {canReport && (
          <Button variant="ghost" onClick={() => setReportOpen(true)} aria-label="게시글 신고">
            <Flag className="h-4 w-4" /> 신고
          </Button>
        )}
      </div>

      {canReport && (
        <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetType="POST" targetId={post.id} />
      )}
    </article>
  );
}
