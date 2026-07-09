'use client';

import * as React from 'react';
import { useAdminReports, useResolveReport } from '@/features/admin/hooks/useAdmin';
import { Button } from '@/components/ui/button';

const STATUS_TABS = [
  { value: 'PENDING', label: '미처리' },
  { value: 'RESOLVED', label: '조치완료' },
  { value: 'REJECTED', label: '반려' },
] as const;

export default function AdminReportsPage() {
  const [status, setStatus] = React.useState<'PENDING' | 'RESOLVED' | 'REJECTED'>('PENDING');
  const { data, isLoading } = useAdminReports({ status });
  const resolveMutation = useResolveReport();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-xl font-semibold text-text-primary">신고 처리</h1>

      <div className="flex gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={
              status === tab.value
                ? 'rounded-full bg-accent-primary-tint px-3 py-1.5 text-sm font-semibold text-accent-primary-strong'
                : 'rounded-full px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-surface-muted'
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {isLoading && <p className="text-sm text-text-muted">불러오는 중...</p>}
        {data?.items.length === 0 && <p className="text-sm text-text-muted">해당 상태의 신고가 없습니다.</p>}
        {data?.items.map((report) => (
          <div key={report.id} className="rounded-card border border-border-hairline bg-bg-surface p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="rounded bg-accent-primary-tint px-1.5 py-0.5 font-medium text-accent-primary-strong">
                  {report.targetType}
                </span>
                <span className="rounded bg-bg-surface-muted px-1.5 py-0.5">{report.reason}</span>
              </div>
              <span className="font-mono text-xs text-text-muted">
                {new Date(report.createdAt).toLocaleString('ko-KR')}
              </span>
            </div>
            <p className="mt-2 text-sm text-text-primary">{report.description ?? '(사유 설명 없음)'}</p>
            <p className="mt-1 text-xs text-text-muted">
              신고자: {report.reporterNickname} · 대상 ID: {report.targetId}
            </p>

            {report.status === 'PENDING' && (
              <div className="mt-3 flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => resolveMutation.mutate({ id: report.id, status: 'RESOLVED' })}
                >
                  조치 완료
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resolveMutation.mutate({ id: report.id, status: 'REJECTED' })}
                >
                  반려
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
