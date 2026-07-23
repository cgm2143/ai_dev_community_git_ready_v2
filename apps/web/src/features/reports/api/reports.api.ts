import { api } from '@/lib/api-client';

/** 신고 대상 타입. 이번 UI에서는 게시글/댓글만 노출한다(USER 신고는 별도). */
export type ReportTargetType = 'POST' | 'COMMENT';

/** 기존 Report enum 그대로 사용. UI 문구만 사용자 친화적으로 표시한다. */
export type ReportReason = 'SPAM' | 'ABUSE' | 'ILLEGAL' | 'ETC';

export interface CreateReportPayload {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
}

export interface ReportResponse {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  createdAt: string;
}

/** 기존 POST /reports 를 그대로 사용한다(새 API 없음). */
export function createReport(payload: CreateReportPayload) {
  return api.post<ReportResponse>('/reports', payload);
}
