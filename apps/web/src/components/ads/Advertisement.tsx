import { cn } from '@/lib/utils';

export type AdVariant = 'top' | 'sidebar';

/**
 * 광고 슬롯 컴포넌트 (Placeholder).
 *
 * 규격을 이 컴포넌트가 소유해, 추후 삽입될 실제 광고 코드(Google AdSense / 자체 광고)도
 * 이 박스 규격에 맞춰 렌더링하면 되도록 구조를 분리한다. 지금은 규격에 맞는 빈 Placeholder만 그린다.
 *
 * variant:
 *  - top     : 상단 배너. Desktop 970x250 / Tablet 728x90 / Mobile 320x100 (반응형)
 *  - sidebar : 사이드바 광고 300x600 (고정)
 *
 * 실제 광고를 넣을 때는 아래 "실제 광고 코드 삽입 위치" 주석 자리에 AdSense <ins> 또는
 * 자체 광고 마크업을 variant별로 렌더링하면 된다.
 */
export function Advertisement({ variant, className }: { variant: AdVariant; className?: string }) {
  const sizeClass =
    variant === 'top'
      ? // Mobile 320x100 → Tablet(md) 728x90 → Desktop(lg) 970x250
        'h-[100px] w-[320px] md:h-[90px] md:w-[728px] lg:h-[250px] lg:w-[970px]'
      : // Sidebar 300x600
        'h-[600px] w-[300px]';

  const label = variant === 'top' ? '상단 배너' : '사이드바';

  return (
    <div
      role="complementary"
      aria-label="광고 영역"
      className={cn(
        'mx-auto flex max-w-full items-center justify-center rounded-card border border-dashed border-border-hairline bg-bg-surface-muted text-text-muted',
        sizeClass,
        className,
      )}
    >
      {/* 실제 광고 코드 삽입 위치 (variant별 AdSense/자체 광고). 현재는 Placeholder UI만 표시. */}
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-[10px] font-semibold uppercase tracking-widest">Advertisement</span>
        <span className="text-xs">광고 영역 · {label}</span>
      </div>
    </div>
  );
}
