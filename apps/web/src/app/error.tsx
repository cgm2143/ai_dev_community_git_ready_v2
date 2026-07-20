'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="font-mono text-4xl">⚠️</p>
      <h1 className="font-display text-2xl font-semibold text-text-primary">문제가 발생했습니다</h1>
      <p className="max-w-sm text-sm text-text-secondary">일시적인 오류일 수 있어요. 다시 시도하거나 잠시 후 접속해 주세요.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="primary" size="sm" onClick={reset}>
          다시 시도
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/">홈으로</Link>
        </Button>
      </div>
    </div>
  );
}
