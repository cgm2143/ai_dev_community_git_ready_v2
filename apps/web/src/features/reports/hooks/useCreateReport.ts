'use client';

import { useMutation } from '@tanstack/react-query';
import { createReport, type CreateReportPayload } from '../api/reports.api';

/**
 * 신고 생성. 신고 목록은 관리자 전용 화면에서만 보이므로 별도 캐시 무효화는 필요 없다.
 * 중복 신고(409 ALREADY_REPORTED) 등 에러는 호출부(모달)가 mutation.error로 표시한다.
 */
export function useCreateReport() {
  return useMutation({
    mutationFn: (payload: CreateReportPayload) => createReport(payload),
  });
}
