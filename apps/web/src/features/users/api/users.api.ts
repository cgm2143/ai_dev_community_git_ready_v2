import { api, apiFetchMultipart } from '@/lib/api-client';
import type { AuthUser } from '@/stores/auth-store';

export interface PublicProfile {
  nickname: string;
  bio: string | null;
  profileImageUrl: string | null;
  createdAt: string;
}

export function getPublicProfile(nickname: string) {
  return api.get<PublicProfile>(`/users/${nickname}`);
}

export interface UpdateProfilePayload {
  nickname?: string;
  bio?: string;
}

export function updateProfile(payload: UpdateProfilePayload) {
  return api.patch<AuthUser>('/users/me', payload);
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export function changePassword(payload: ChangePasswordPayload) {
  return api.patch<void>('/users/me/password', payload);
}

export interface UploadedProfileImage {
  profileImageUrl: string;
  profileThumbnailUrl: string | null;
}

export function uploadProfileImage(file: File): Promise<UploadedProfileImage> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetchMultipart<UploadedProfileImage>('/users/me/profile-image', formData);
}

export function withdrawAccount(password?: string) {
  return api.delete<void>('/users/me', password ? { password } : undefined);
}

export interface BlockedUser {
  id: string;
  nickname: string;
  profileImageUrl: string | null;
  blockedAt: string;
}

export function listBlockedUsers() {
  return api.get<BlockedUser[]>('/users/me/blocks');
}

export function blockUser(userId: string) {
  return api.post<void>(`/users/${userId}/block`);
}

export function unblockUser(userId: string) {
  return api.delete<void>(`/users/${userId}/block`);
}
