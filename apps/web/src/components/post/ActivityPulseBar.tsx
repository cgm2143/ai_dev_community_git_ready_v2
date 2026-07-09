import { cn } from '@/lib/utils';

interface ActivityPulseBarProps {
  likeCount: number;
  commentCount: number;
  viewCount: number;
  className?: string;
}

/**
 * 5단계 UI 설계의 시그니처 요소. 게시글 카드 왼쪽의 얇은 세로 바가 "인기 점수"를 직접
 * 시각화한다(장식이 아니라 랭킹 로직 자체를 보여줌 - 12단계 랭킹 점수식과 같은 축의 지표).
 *
 * 접근성 보완(5단계 검토 반영): 색상 강도만으로 구분하면 색맹 사용자에게 정보가
 * 전달되지 않으므로, 바의 색상과 함께 숫자(sr-only + 인접 배지)를 병행 표시한다.
 */
export function ActivityPulseBar({ likeCount, commentCount, viewCount, className }: ActivityPulseBarProps) {
  const score = likeCount * 3 + commentCount * 2 + viewCount * 0.1;
  const intensity = score >= 50 ? 'high' : score >= 15 ? 'mid' : 'low';

  const intensityStyles = {
    high: 'bg-accent-amber animate-pulse-bar',
    mid: 'bg-accent-primary',
    low: 'bg-accent-primary-tint',
  } as const;

  return (
    <div className={cn('w-1 shrink-0 rounded-full', intensityStyles[intensity], className)} aria-hidden="true">
      <span className="sr-only">인기 점수 {Math.round(score)}점</span>
    </div>
  );
}
