import { Advertisement } from '@/components/ads/Advertisement';

/**
 * 상단 배너 광고 영역. Header 바로 아래, 본문 컬럼 위 전체 폭.
 * 규격/실제 광고 삽입은 Advertisement(variant="top")가 담당한다(반응형 970x250 / 728x90 / 320x100).
 */
export function TopBanner() {
  return (
    <div className="border-b border-border-hairline bg-bg-page">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-3">
        <Advertisement variant="top" />
      </div>
    </div>
  );
}
