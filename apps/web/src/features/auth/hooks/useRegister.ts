'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { register } from '../api/auth.api';
import { useAuthStore } from '@/stores/auth-store';
import type { RegisterFormValues } from '@/schemas/auth.schema';

export function useRegister() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: (values: RegisterFormValues) =>
      register({ email: values.email, nickname: values.nickname, password: values.password }),
    onSuccess: (data) => {
      // 이메일 인증 절차를 제거했으므로, 가입과 동시에 로그인되어 바로 홈으로 진입한다.
      setSession(data.accessToken, data.user);
      router.push('/');
      router.refresh();
    },
  });
}
