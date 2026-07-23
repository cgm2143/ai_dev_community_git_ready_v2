import { Advertisement } from '@/components/ads/Advertisement';

/**
 * 좌측 광고 영역 - 300x600 광고 슬롯(Advertisement variant="sidebar").
 * Desktop(xl+)에서만 노출하고 Tablet 이하에서는 숨긴다(요구사항).
 * 폭은 명시하지 않고 콘텐츠(300px 광고 + p-4 여백)에 맞춰 자동으로 잡힌다.
 * 광고는 Header 아래에 sticky로 고정되어 본문 스크롤 시에도 노출을 유지한다.
 */
export function LeftAside() {
  return (
    <aside className="hidden shrink-0 border-r border-border-hairline bg-bg-surface p-4 xl:block">
      <div className="sticky top-20">
        <Advertisement variant="sidebar" />
      </div>
    </aside>
  );
}
