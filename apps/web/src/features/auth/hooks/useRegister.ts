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
      setSession(data.accessToken, data.user);
      // 가입 직후에는 이메일 미인증 상태이므로, 인증 안내 화면으로 보낸다
      // (백엔드 EmailVerifiedGuard가 커뮤니티 활동 관련 API를 막고 있음을 안내).
      router.push('/verify-email');
      router.refresh();
    },
  });
}
