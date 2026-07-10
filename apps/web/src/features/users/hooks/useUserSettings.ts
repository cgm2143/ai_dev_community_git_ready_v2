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
  const setSession = useAuthStore((state) => state.setSession);
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: (file: File) => uploadProfileImage(file),
    onSuccess: (result) => {
      if (accessToken && user) {
        setSession(accessToken, { ...user, profileImageUrl: result.profileImageUrl });
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
