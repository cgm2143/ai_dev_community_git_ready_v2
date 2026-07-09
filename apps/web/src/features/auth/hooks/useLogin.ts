'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { login } from '../api/auth.api';
import { useAuthStore } from '@/stores/auth-store';
import type { LoginFormValues } from '@/schemas/auth.schema';

export function useLogin() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: (values: LoginFormValues) => login(values),
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
      router.push('/');
      router.refresh();
    },
  });
}
