import { AdSlot } from '@/components/ads/AdSlot';

export function RightSidebar() {
  return (
    <aside className="hidden w-aside shrink-0 flex-col gap-6 border-l border-border-hairline bg-bg-surface p-4 xl:flex">
      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">공지사항</h4>
        <p className="text-sm text-text-secondary">등록된 공지가 없습니다.</p>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">인기 태그</h4>
        <p className="text-sm text-text-muted">검색어 기반 태그 조회 API(7단계)에 연결 예정입니다.</p>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">광고</h4>
        <AdSlot slotCode="HOME_SIDEBAR_1" />
      </section>
    </aside>
  );
}
