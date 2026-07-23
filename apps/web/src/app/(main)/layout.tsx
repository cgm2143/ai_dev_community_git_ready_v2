import { Header } from '@/components/layout/Header';
import { LeftAside } from '@/components/layout/LeftAside';
import { RightSidebar } from '@/components/layout/RightSidebar';

/**
 * 메인 레이아웃 - 좌/우 사이드바 확장을 위한 포털형 구조.
 *
 *   ┌───────────────── Navigation (Header) ─────────────────┐
 *   ├────────────┬──────────────────────────┬───────────────┤
 *   │ Left Aside │        Main Content       │ Right Sidebar │
 *   │  (240px)   │         (flex-1)          │    (300px)    │
 *   └────────────┴──────────────────────────┴───────────────┘
 *
 * - Desktop(xl+): 좌/우 보조 영역 + 본문 3분할
 * - Tablet(<xl): 좌/우 보조 영역 숨김, 본문 단독
 * - Mobile: 단일 컬럼(햄버거 네비게이션은 Header에서 처리)
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto flex w-full max-w-[1600px] flex-1">
        <LeftAside />
        <main className="min-w-0 flex-1 px-4 py-5">
          <div className="mx-auto flex max-w-[820px] flex-col gap-3">{children}</div>
        </main>
        <RightSidebar />
      </div>
    </div>
  );
}
