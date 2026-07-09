import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { RightSidebar } from '@/components/layout/RightSidebar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto flex w-full max-w-[1280px] flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-5">
          <div className="mx-auto flex max-w-[720px] flex-col gap-3">{children}</div>
        </main>
        <RightSidebar />
      </div>
    </div>
  );
}
