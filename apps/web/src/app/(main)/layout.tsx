import { Header } from '@/components/layout/Header';
import { RightSidebar } from '@/components/layout/RightSidebar';

/**
 * 종합 커뮤니티 리뉴얼: 좌측 Sidebar를 제거하고 상단 GNB(Header 내 Navigation)로 이동했다.
 * 본문은 넓게 쓰고, 우측 보조 영역(공지/인기태그/광고)만 xl 이상에서 유지한다.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto flex w-full max-w-[1280px] flex-1">
        <main className="min-w-0 flex-1 px-4 py-5">
          <div className="mx-auto flex max-w-[820px] flex-col gap-3">{children}</div>
        </main>
        <RightSidebar />
      </div>
    </div>
  );
}
