'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { refreshAccessToken } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

/**
 * 네이버/카카오/구글 로그인이 끝나면 백엔드가 이 페이지로 리다이렉트한다.
 * 이 시점에는 이미 백엔드가 Refresh Token을 HttpOnly 쿠키로 심어둔 상태이므로,
 * Access Token을 URL에 실어 나르는 대신(탈취 위험) 기존 로그인 흐름과 동일하게
 * /auth/refresh를 한 번 호출해 쿠키로부터 Access Token을 받아온다.
 */
export default function SocialAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasError = searchParams.get('error') === '1';
  const [failed, setFailed] = React.useState(false);
  const setBootstrapped = useAuthStore((state) => state.setBootstrapped);

  React.useEffect(() => {
    if (hasError) {
      setFailed(true);
      setBootstrapped();
      return;
    }

    refreshAccessToken()
      .then((token) => {
        if (token) {
          router.replace('/');
        } else {
          setFailed(true);
        }
      })
      .finally(() => setBootstrapped());
  }, [hasError, router, setBootstrapped]);

  if (failed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg-page px-4 text-center">
        <p className="text-sm text-text-secondary">로그인에 실패했습니다. 다시 시도해 주세요.</p>
        <a href="/login" className="text-sm font-medium text-accent-primary-strong hover:underline">
          로그인 화면으로 돌아가기
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
    </div>
  );
}
