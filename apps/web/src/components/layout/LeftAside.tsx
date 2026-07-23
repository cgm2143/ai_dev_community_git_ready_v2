/**
 * 좌측 보조 영역 (Placeholder). 폭 240px.
 * Desktop(xl+)에서만 노출하고 Tablet 이하에서는 숨긴다(요구사항).
 * 추후 광고/카테고리 위젯 등을 이 컴포넌트 내부에 렌더링한다.
 */
export function LeftAside() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border-hairline bg-bg-surface p-4 xl:block">
      <div className="sticky top-20 flex h-40 items-center justify-center rounded-card border border-dashed border-border-hairline text-center text-xs text-text-muted">
        좌측 위젯 영역
        <br />
        (Placeholder)
      </div>
    </aside>
  );
}
