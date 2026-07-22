import { api } from '@/lib/api-client';
import type { PaginatedResponse } from '@/features/posts/api/posts.api';

// ── 통계 ──────────────────────────────────────────────
export interface StatsOverview {
  totalUsers: number;
  activeUsers: number;
  todaySignups: number;
  totalPosts: number;
  totalComments: number;
  pendingReports: number;
}

export interface ReportStats {
  byReason: { reason: string; count: number }[];
  byStatus: { status: string; count: number }[];
  topReportedTargets: { targetType: string; targetId: string; reportCount: number }[];
}

export function getStatsOverview() {
  return api.get<StatsOverview>('/admin/stats/overview');
}

export function getReportStats() {
  return api.get<ReportStats>('/admin/stats/reports');
}

// ── 회원 관리 ──────────────────────────────────────────
export interface AdminUser {
  id: string;
  email: string;
  nickname: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN';
  role: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export function getAdminUsers(params: { keyword?: string; status?: string; page?: number; limit?: number } = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value !== undefined && search.set(key, String(value)));
  return api.get<PaginatedResponse<AdminUser>>(`/admin/users?${search.toString()}`);
}

export function updateUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED') {
  return api.patch<AdminUser>(`/admin/users/${userId}/status`, { status });
}

export function updateUserRole(userId: string, roleName: string) {
  return api.patch<AdminUser>(`/admin/users/${userId}/role`, { roleName });
}

// ── 신고 ──────────────────────────────────────────────
export interface AdminReport {
  id: string;
  reporterId: string;
  reporterNickname: string;
  targetType: 'POST' | 'COMMENT' | 'USER';
  targetId: string;
  reason: 'SPAM' | 'ABUSE' | 'ILLEGAL' | 'ETC';
  description: string | null;
  status: 'PENDING' | 'RESOLVED' | 'REJECTED';
  resolvedBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export function getAdminReports(params: { status?: string; page?: number; limit?: number } = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value !== undefined && search.set(key, String(value)));
  return api.get<PaginatedResponse<AdminReport>>(`/admin/reports?${search.toString()}`);
}

export function resolveReport(id: string, status: 'RESOLVED' | 'REJECTED') {
  return api.patch<AdminReport>(`/admin/reports/${id}`, { status });
}

// ── 광고 ──────────────────────────────────────────────
export interface AdminAd {
  id: string;
  slotId: string;
  type: 'IMAGE' | 'HTML' | 'SCRIPT' | 'ADSENSE';
  purpose: 'AD' | 'EVENT_BANNER';
  content: string;
  linkUrl: string | null;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
}

export interface AdStats {
  adId: string;
  impressionCount: number;
  clickCount: number;
  ctr: number;
}

export function getAdminAds() {
  return api.get<AdminAd[]>('/admin/ads');
}

export interface CreateAdPayload {
  slotCode: string;
  type: AdminAd['type'];
  purpose?: AdminAd['purpose'];
  content: string;
  linkUrl?: string;
  isActive?: boolean;
  startAt?: string;
  endAt?: string;
}

export function createAd(payload: CreateAdPayload) {
  return api.post<AdminAd>('/admin/ads', payload);
}

export function updateAd(id: string, payload: Partial<CreateAdPayload>) {
  return api.patch<AdminAd>(`/admin/ads/${id}`, payload);
}

export function deleteAd(id: string) {
  return api.delete<void>(`/admin/ads/${id}`);
}

export function getAdStats(id: string) {
  return api.get<AdStats>(`/admin/ads/${id}/stats`);
}

// ── 금칙어 ────────────────────────────────────────────
export interface BannedWord {
  id: string;
  word: string;
  createdAt: string;
}

export function getBannedWords() {
  return api.get<BannedWord[]>('/admin/words');
}

export function addBannedWord(word: string) {
  return api.post<BannedWord>('/admin/words', { word });
}

export function removeBannedWord(id: string) {
  return api.delete<void>(`/admin/words/${id}`);
}

// ── IP 차단 ───────────────────────────────────────────
export interface IpBan {
  id: string;
  ipAddress: string;
  reason: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export function getIpBans() {
  return api.get<IpBan[]>('/admin/ip-bans');
}

export function addIpBan(payload: { ipAddress: string; reason?: string; expiresAt?: string }) {
  return api.post<IpBan>('/admin/ip-bans', payload);
}

export function removeIpBan(id: string) {
  return api.delete<void>(`/admin/ip-bans/${id}`);
}

// ── 사이트 설정 ────────────────────────────────────────
export interface SiteSetting {
  key: string;
  value: unknown;
  updatedAt: string;
}

export function getSiteSettings() {
  return api.get<SiteSetting[]>('/admin/settings');
}

export function updateSiteSetting(key: string, value: unknown) {
  return api.patch<SiteSetting>(`/admin/settings/${key}`, { value });
}

// ── 로그 ──────────────────────────────────────────────
export interface AdminLog {
  id: string;
  adminId: string;
  adminNickname: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export function getAdminLogs(params: { action?: string; page?: number; limit?: number } = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value !== undefined && search.set(key, String(value)));
  return api.get<PaginatedResponse<AdminLog>>(`/admin/logs?${search.toString()}`);
}

// ── 카테고리 (상단 네비게이션 관리) ──────────────────────
export interface AdminCategoryBoard {
  id: string;
  name: string;
  slug: string;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  menuOrder: number;
  isPrimaryMenu: boolean;
  isActive: boolean;
  sortOrder: number;
  boards: AdminCategoryBoard[];
}

export interface UpdateCategoryPayload {
  name?: string;
  slug?: string;
  icon?: string;
  menuOrder?: number;
  isPrimaryMenu?: boolean;
  isActive?: boolean;
}

export function getAdminCategories() {
  return api.get<AdminCategory[]>('/admin/categories');
}

export function updateCategory(id: string, payload: UpdateCategoryPayload) {
  return api.patch<AdminCategory>(`/admin/categories/${id}`, payload);
}

/** 카테고리/게시판을 기본 시드(DEFAULT_CATEGORY_SEED)로 초기화 */
export function resetCategories() {
  return api.post<void>('/admin/categories/reset');
}

// ── 게시판 (Board 관리) ──────────────────────────────
export interface AdminBoard {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateBoardPayload {
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateBoardPayload {
  categoryId?: string;
  name?: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export function getAdminBoards() {
  return api.get<AdminBoard[]>('/admin/boards');
}

export function createBoard(payload: CreateBoardPayload) {
  return api.post<AdminBoard>('/admin/boards', payload);
}

export function updateBoard(id: string, payload: UpdateBoardPayload) {
  return api.patch<AdminBoard>(`/admin/boards/${id}`, payload);
}

export function deleteBoard(id: string) {
  return api.delete<void>(`/admin/boards/${id}`);
}
