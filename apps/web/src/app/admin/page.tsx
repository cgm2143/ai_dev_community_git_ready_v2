'use client';

import { useStatsOverview, useReportStats } from '@/features/admin/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs text-text-muted">{label}</p>
        <p className="font-mono text-2xl font-semibold text-text-primary">{value.toLocaleString('ko-KR')}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { data: overview, isLoading } = useStatsOverview();
  const { data: reportStats } = useReportStats();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-xl font-semibold text-text-primary">대시보드</h1>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-card bg-bg-surface-muted" />
          ))}
        </div>
      ) : (
        overview && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatCard label="전체 회원" value={overview.totalUsers} />
            <StatCard label="활성 회원" value={overview.activeUsers} />
            <StatCard label="오늘 가입" value={overview.todaySignups} />
            <StatCard label="게시글" value={overview.totalPosts} />
            <StatCard label="댓글" value={overview.totalComments} />
            <StatCard label="미처리 신고" value={overview.pendingReports} />
          </div>
        )
      )}

      {reportStats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>신고 사유별 통계</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {reportStats.byReason.map((row) => (
                <div key={row.reason} className="flex justify-between text-sm">
                  <span className="text-text-secondary">{row.reason}</span>
                  <span className="font-mono text-text-primary">{row.count}</span>
                </div>
              ))}
              {reportStats.byReason.length === 0 && <p className="text-sm text-text-muted">데이터가 없습니다.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>처리 현황</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {reportStats.byStatus.map((row) => (
                <div key={row.status} className="flex justify-between text-sm">
                  <span className="text-text-secondary">{row.status}</span>
                  <span className="font-mono text-text-primary">{row.count}</span>
                </div>
              ))}
              {reportStats.byStatus.length === 0 && <p className="text-sm text-text-muted">데이터가 없습니다.</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
