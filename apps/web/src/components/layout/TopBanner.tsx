/**
 * 상단 배너 영역 (Placeholder).
 * 이번 단계는 레이아웃 슬롯만 만든다 - 실제 광고/공지 배너는 추후 이 컴포넌트 내부에 렌더링한다.
 * Header 바로 아래, 본문 컬럼 위 전체 폭 영역을 차지한다.
 */
export function TopBanner() {
  return (
    <div className="border-b border-border-hairline bg-bg-page">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-3">
        <div className="flex h-16 items-center justify-center rounded-card border border-dashed border-border-hairline text-xs text-text-muted">
          상단 배너 영역 (Placeholder)
        </div>
      </div>
    </div>
  );
}
