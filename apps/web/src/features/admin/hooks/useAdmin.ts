'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as adminApi from '../api/admin.api';

// ── 통계 ──────────────────────────────────────────────
export function useStatsOverview() {
  return useQuery({ queryKey: ['admin-stats-overview'], queryFn: adminApi.getStatsOverview });
}

export function useReportStats() {
  return useQuery({ queryKey: ['admin-report-stats'], queryFn: adminApi.getReportStats });
}

// ── 회원 ──────────────────────────────────────────────
export function useAdminUsers(params: { keyword?: string; status?: string; page?: number } = {}) {
  return useQuery({ queryKey: ['admin-users', params], queryFn: () => adminApi.getAdminUsers(params) });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      adminApi.updateUserStatus(userId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleName }: { userId: string; roleName: string }) =>
      adminApi.updateUserRole(userId, roleName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

// ── 신고 ──────────────────────────────────────────────
export function useAdminReports(params: { status?: string; page?: number } = {}) {
  return useQuery({ queryKey: ['admin-reports', params], queryFn: () => adminApi.getAdminReports(params) });
}

export function useResolveReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'RESOLVED' | 'REJECTED' }) =>
      adminApi.resolveReport(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-report-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats-overview'] });
    },
  });
}

// ── 광고 ──────────────────────────────────────────────
export function useAdminAds() {
  return useQuery({ queryKey: ['admin-ads'], queryFn: adminApi.getAdminAds });
}

export function useCreateAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createAd,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-ads'] }),
  });
}

export function useDeleteAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteAd,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-ads'] }),
  });
}

export function useAdStats(id: string, enabled: boolean) {
  return useQuery({ queryKey: ['admin-ad-stats', id], queryFn: () => adminApi.getAdStats(id), enabled });
}

// ── 금칙어 ────────────────────────────────────────────
export function useBannedWords() {
  return useQuery({ queryKey: ['banned-words'], queryFn: adminApi.getBannedWords });
}

export function useAddBannedWord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.addBannedWord,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banned-words'] }),
  });
}

export function useRemoveBannedWord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.removeBannedWord,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banned-words'] }),
  });
}

// ── IP 차단 ───────────────────────────────────────────
export function useIpBans() {
  return useQuery({ queryKey: ['ip-bans'], queryFn: adminApi.getIpBans });
}

export function useAddIpBan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.addIpBan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ip-bans'] }),
  });
}

export function useRemoveIpBan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.removeIpBan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ip-bans'] }),
  });
}

// ── 사이트 설정 ────────────────────────────────────────
export function useSiteSettings() {
  return useQuery({ queryKey: ['site-settings'], queryFn: adminApi.getSiteSettings });
}

export function useUpdateSiteSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => adminApi.updateSiteSetting(key, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['site-settings'] }),
  });
}

// ── 로그 ──────────────────────────────────────────────
export function useAdminLogs(params: { action?: string; page?: number } = {}) {
  return useQuery({ queryKey: ['admin-logs', params], queryFn: () => adminApi.getAdminLogs(params) });
}

// ── 카테고리 (상단 네비게이션 관리) ──────────────────────
export function useAdminCategories() {
  return useQuery({ queryKey: ['admin-categories'], queryFn: adminApi.getAdminCategories });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: adminApi.UpdateCategoryPayload }) =>
      adminApi.updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      // 상단 GNB가 쓰는 공개 카테고리 캐시도 무효화해 즉시 반영되게 한다.
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useResetCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.resetCategories(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
