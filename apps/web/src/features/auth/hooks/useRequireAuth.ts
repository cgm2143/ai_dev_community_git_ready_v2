'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

/**
 * 로그인이 필요한 페이지(글쓰기, 수정, 설정 등)에서 사용한다.
 * 세션 복구(bootstrap)가 끝났는데도 로그인되어 있지 않으면 /login으로 보낸다.
 * 반환값 isChecking이 true인 동안은 아직 로그인 여부를 확정할 수 없는 상태이므로,
 * 호출부는 이 값이 true일 때 로딩 화면을 보여주고 실제 폼/콘텐츠를 렌더링하지 않아야 한다.
 */
export function useRequireAuth() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);

  React.useEffect(() => {
    if (!isBootstrapping && !user) {
      router.replace('/login');
    }
  }, [isBootstrapping, user, router]);

  return { isChecking: isBootstrapping || !user };
}
