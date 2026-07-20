'use client';

import { Sparkles } from 'lucide-react';
import { usePostSummary } from '@/features/ai/hooks/usePostSummary';

/**
 * 게시글 상세 상단 AI 요약 카드.
 * - 최초 요청 시 서버가 생성 작업을 등록하고 pending을 반환 → polling으로 완료 확인.
 * - unavailable(요약 없음/AI 비활성)이면 카드를 숨긴다.
 * - 실패 시 게시글 본문에는 영향을 주지 않고 간단한 안내만 노출한다.
 */
export function AiSummaryCard({ postId }: { postId: string }) {
  const { data, isLoading, isError } = usePostSummary(postId);

  // AI가 비활성이거나 요약 대상이 아니면 아무것도 렌더링하지 않는다.
  if (data?.status === 'unavailable') return null;

  const isPending = isLoading || data?.status === 'pending';

  return (
    <section
      aria-label="AI 요약"
      className="rounded-card border border-accent-primary/30 bg-accent-primary/5 p-4"
    >
      <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-accent-primary-strong">
        <Sparkles className="h-4 w-4" aria-hidden />
        AI 요약
      </div>

      {isError ? (
        <p className="text-sm text-text-secondary">AI 요약을 생성할 수 없습니다.</p>
      ) : isPending ? (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent-primary/40 border-t-accent-primary" />
          AI 요약을 생성하고 있습니다…
        </div>
      ) : (
        <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">{data?.summary}</p>
      )}
    </section>
  );
}
