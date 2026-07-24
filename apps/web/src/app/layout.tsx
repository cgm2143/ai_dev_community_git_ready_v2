import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Providers } from './providers';
import { Footer } from '@/components/layout/Footer';
import './globals.css';

// Pretendard Variable (self-hosted). 사이트 전체 기본 글꼴.
// 제목/본문/메타(--font-display, --font-body, --font-mono)를 모두 이 한 폰트로 통일한다(globals.css).
const pretendard = localFont({
  src: './fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  weight: '45 920',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '코비온 — AI 개발자 커뮤니티',
  description: '터미널처럼 빠르고, Discord처럼 활기차고, 디시처럼 즉각적인 개발자 게시판',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // 기본값은 라이트모드. 다크모드는 헤더의 수동 토글로만 전환한다(5단계 UI 설계 정책).
    <html lang="ko" className={pretendard.variable}>
      <body className="flex min-h-screen flex-col font-body">
        <Providers>
          <div className="flex flex-1 flex-col">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
