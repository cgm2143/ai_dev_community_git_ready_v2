'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';

export default function VerifyEmailPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>이메일 인증이 필요합니다</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            {user?.email ?? '가입하신 이메일'}로 인증 메일을 보내드렸습니다. 메일함(스팸함 포함)을 확인해
            링크를 눌러주세요. 인증 전에는 글쓰기, 댓글, 추천 등 커뮤니티 활동이 제한됩니다.
          </p>
          <Button variant="outline" asChild>
            <Link href="/">둘러보기 계속하기</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
