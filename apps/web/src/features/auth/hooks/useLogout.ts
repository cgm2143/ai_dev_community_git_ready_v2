'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { logout } from '../api/auth.api';
import { useAuthStore } from '@/stores/auth-store';

export function useLogout() {
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      clearSession();
      router.push('/');
      router.refresh();
    },
  });
}
