import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="font-mono text-5xl font-bold text-accent-primary-strong">404</p>
      <h1 className="font-display text-xl font-semibold text-text-primary">페이지를 찾을 수 없습니다</h1>
      <p className="max-w-sm text-sm text-text-secondary">주소가 바뀌었거나 삭제된 콘텐츠일 수 있어요.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="primary" size="sm" asChild>
          <Link href="/">홈으로</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/hot">인기글 보기</Link>
        </Button>
      </div>
    </div>
  );
}
