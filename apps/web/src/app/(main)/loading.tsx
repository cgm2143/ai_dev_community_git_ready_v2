/** (main) 라우트 전환 시 기본 스켈레톤. 데이터 훅 마운트 이전 빈 화면을 방지한다. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-7 w-40 animate-pulse rounded bg-bg-surface-muted" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-card bg-bg-surface-muted" />
      ))}
    </div>
  );
}
