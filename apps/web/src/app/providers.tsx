'use client';

import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/query-client';
import { refreshAccessToken } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationSocket } from '@/features/notifications/hooks/useNotifications';

/**
 * 앱이 처음 마운트될 때 딱 한 번 세션 복구를 시도한다. Access Token은 새로고침하면 사라지는
 * 메모리 값이므로, HttpOnly Refresh Token 쿠키가 아직 유효하다면 이 호출로 조용히 재로그인된
 * 것과 같은 상태가 된다. 실패해도(비로그인 상태) 에러를 띄우지 않고 그냥 비로그인으로 둔다.
 */
function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const setBootstrapped = useAuthStore((state) => state.setBootstrapped);

  React.useEffect(() => {
    refreshAccessToken().finally(() => setBootstrapped());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 로그인 상태가 확정된 뒤에만 의미가 있으므로 부트스트랩 로딩 중에는 소켓을 열지 않는다
  // (훅 내부에서 user가 없으면 어차피 연결하지 않지만, 순서를 명확히 하기 위해 여기서 호출한다).
  useNotificationSocket();

  if (isBootstrapping) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-bg-page">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>{children}</AuthBootstrap>
    </QueryClientProvider>
  );
}
