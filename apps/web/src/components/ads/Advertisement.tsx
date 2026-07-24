import { cn } from '@/lib/utils';

export type AdVariant = 'hero' | 'sidebar';

interface AdvertisementProps {
  /** 광고 슬롯 성격. 기본 규격(size 미지정 시)과 고정 레이아웃을 결정한다. */
  variant?: AdVariant;
  /** 노출할 광고 규격 라벨 (예: '970 x 250'). 미지정 시 variant 기본값을 사용한다. */
  size?: string;
  /** 박스 상단에 표시할 라벨 텍스트. */
  title?: string;
  className?: string;
}

/** variant별 기본 규격 라벨. size prop이 없을 때 사용한다. */
const DEFAULT_SIZE: Record<AdVariant, string> = {
  hero: '970 x 250',
  sidebar: '300 x 600',
};

/**
 * 광고 슬롯 Placeholder (Shadcn 스타일: border + rounded-xl + background + shadow).
 *
 * 실제 광고 코드는 넣지 않는다. 추후 Google AdSense `<ins>` 또는 자체 광고 마크업을
 * "실제 광고 코드 삽입 위치" 주석 자리에 그대로 끼워 넣으면 되도록 규격 박스만 그린다.
 * 색상/여백/치수는 className으로 오버라이드할 수 있어(예: Hero의 어두운 배경 위) 재사용성을 높인다.
 */
export function Advertisement({ variant = 'hero', size, title = '광고 영역', className }: AdvertisementProps) {
  const label = size ?? DEFAULT_SIZE[variant];

  return (
    <div
      role="complementary"
      aria-label={`광고 영역 ${label}`}
      className={cn(
        'flex max-w-full items-center justify-center rounded-xl border border-dashed border-border-hairline bg-bg-surface-muted text-text-muted shadow-sm',
        // sidebar는 고정 규격(300x600)을 유지한다(LeftAside 호환).
        variant === 'sidebar' && 'h-[600px] w-[300px]',
        className,
      )}
    >
      {/* 실제 광고 코드 삽입 위치 (Google AdSense 등). 현재는 규격 Placeholder만 표시한다. */}
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-[11px] font-semibold uppercase tracking-widest">{title}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  );
}
