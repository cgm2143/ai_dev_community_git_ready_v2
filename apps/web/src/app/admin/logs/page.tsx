'use client';

import * as React from 'react';
import { useAdminLogs } from '@/features/admin/hooks/useAdmin';
import { Input } from '@/components/ui/input';

export default function AdminLogsPage() {
  const [action, setAction] = React.useState('');
  const { data, isLoading } = useAdminLogs({ action: action || undefined });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-xl font-semibold text-text-primary">관리자 로그</h1>

      <Input
        value={action}
        onChange={(e) => setAction(e.target.value)}
        placeholder="action으로 필터 (예: USER_SUSPEND)"
        className="max-w-sm font-mono"
      />

      <div className="overflow-x-auto rounded-card border border-border-hairline bg-bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border-hairline text-left text-xs text-text-muted">
            <tr>
              <th className="p-3">시각</th>
              <th className="p-3">관리자</th>
              <th className="p-3">액션</th>
              <th className="p-3">대상</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-text-muted">
                  불러오는 중...
                </td>
              </tr>
            )}
            {data?.items.map((log) => (
              <tr key={log.id} className="border-b border-border-hairline last:border-0">
                <td className="p-3 font-mono text-xs text-text-muted">
                  {new Date(log.createdAt).toLocaleString('ko-KR')}
                </td>
                <td className="p-3 text-text-primary">{log.adminNickname}</td>
                <td className="p-3">
                  <span className="rounded bg-accent-primary-tint px-1.5 py-0.5 text-xs font-medium text-accent-primary-strong">
                    {log.action}
                  </span>
                </td>
                <td className="p-3 font-mono text-xs text-text-muted">
                  {log.targetType ? `${log.targetType}:${log.targetId}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
