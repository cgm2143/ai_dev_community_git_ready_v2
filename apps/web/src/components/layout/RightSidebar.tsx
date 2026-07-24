import { AdSlot } from '@/components/ads/AdSlot';
import { PopularTags } from './PopularTags';
import { SearchWidget } from './SearchWidget';

export function RightSidebar() {
  return (
    <aside className="hidden w-[300px] shrink-0 flex-col gap-4 border-l border-border-hairline bg-bg-page p-4 xl:flex">
      {/* 최상단: 검색바 + 인기 검색어 Top 5 */}
      <SearchWidget />

      {/* 공지사항 (별도 흰색 박스) */}
      <section className="rounded-card border border-border-hairline bg-bg-surface p-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">공지사항</h4>
        <p className="text-sm text-text-secondary">등록된 공지가 없습니다.</p>
      </section>

      <section className="rounded-card border border-border-hairline bg-bg-surface p-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">인기 태그</h4>
        <PopularTags />
      </section>

      <section className="rounded-card border border-border-hairline bg-bg-surface p-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">광고</h4>
        <AdSlot slotCode="HOME_SIDEBAR_1" />
      </section>
    </aside>
  );
}
