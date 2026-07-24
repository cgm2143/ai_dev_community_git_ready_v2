import { Advertisement } from '@/components/ads/Advertisement';

/**
 * 홈 상단 Hero 배너.
 * - 좌측: 커뮤니티 소개 문구, 우측: 광고 Placeholder(Advertisement).
 * - Desktop(md+): 높이 250px, 좌우 배치(텍스트 | 970x250 광고), 전체 컨테이너 폭, rounded-xl.
 * - Mobile: 세로 배치(텍스트 위 → 320x100 광고 아래).
 * 배경은 어두운 그라데이션 + shadow로 Hero 톤을 준다(Shadcn 스타일).
 */
export function TopBanner() {
  return (
    <section className="overflow-hidden rounded-xl border border-border-hairline bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 shadow-md">
      <div className="flex flex-col items-center gap-5 p-6 text-center md:h-[250px] md:flex-row md:justify-between md:gap-8 md:px-10 md:text-left">
        <div className="flex shrink-0 flex-col gap-2 break-keep">
          <h2 className="font-display text-2xl font-bold text-white md:text-3xl">AI 개발 커뮤니티</h2>
          <p className="text-sm text-slate-300 md:text-base">개발자들을 위한 AI · 개발 · 커뮤니티</p>
        </div>

        {/* Desktop/Tablet(md+): 970 x 250 규격 Placeholder */}
        <Advertisement
          variant="hero"
          size="970 x 250"
          className="hidden h-[200px] w-full flex-1 border-white/25 bg-white/10 text-white/80 md:flex md:max-w-[620px]"
        />

        {/* Mobile: 320 x 100 규격 Placeholder (텍스트 아래) */}
        <Advertisement
          variant="hero"
          size="320 x 100"
          className="flex h-[100px] w-full max-w-[320px] border-white/25 bg-white/10 text-white/80 md:hidden"
        />
      </div>
    </section>
  );
}
