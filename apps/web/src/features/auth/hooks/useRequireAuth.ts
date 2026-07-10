'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

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
