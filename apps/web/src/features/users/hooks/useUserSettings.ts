'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  updateProfile,
  changePassword,
  uploadProfileImage,
  withdrawAccount,
  listBlockedUsers,
  unblockUser,
  type UpdateProfilePayload,
  type ChangePasswordPayload,
} from '../api/users.api';
import { useAuthStore } from '@/stores/auth-store';

export function useUpdateProfile() {
  const setSession = useAuthStore((state) => state.setSession);
  const accessToken = useAuthStore((state) => state.accessToken);

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: (user) => {
      if (accessToken) setSession(accessToken, user);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => changePassword(payload),
  });
}

export function useUploadProfileImage() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  return useMutation({
    mutationFn: (file: File) => uploadProfileImage(file),
    onSuccess: (result) => {
      if (accessToken && user) {
        setSession(accessToken, { ...user, profileImageUrl: result.profileImageUrl });
        // 프로필 조회 캐시도 함께 무효화한다. store만 갱신하면 useProfile을 쓰는 화면
        // (설정/프로필 페이지)은 옛 이미지를 계속 보여준다.
        void queryClient.invalidateQueries({ queryKey: ['profile', user.nickname] });
      }
    },
  });
}

export function useWithdrawAccount() {
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation({
    mutationFn: (password?: string) => withdrawAccount(password),
    onSuccess: () => {
      clearSession();
      router.push('/');
    },
  });
}

export function useBlockedUsers() {
  return useQuery({ queryKey: ['blocked-users'], queryFn: listBlockedUsers });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => unblockUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blocked-users'] }),
  });
}
