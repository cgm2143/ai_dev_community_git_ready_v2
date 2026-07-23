'use client';

import * as React from 'react';
import Link from 'next/link';
import { useStatsOverview, useReportStats, useAiMetrics, useAdminUsers, useAdminReports } from '@/features/admin/hooks/useAdmin';
import { usePosts } from '@/features/posts/hooks/usePosts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function StatCard({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  const display = typeof value === 'number' ? value.toLocaleString('ko-KR') : value;
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs text-text-muted">{label}</p>
        <p className="font-mono text-2xl font-semibold text-text-primary">
          {display}
          {suffix && <span className="ml-0.5 text-sm font-normal text-text-muted">{suffix}</span>}
        </p>
      </CardContent>
    </Card>
  );
}

/** 재사용 소형 테이블(카테고리/게시판 화면과 동일한 plain table 패턴). */
function MiniTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-hairline text-left text-xs text-text-muted">
            {headers.map((h) => (
              <th key={h} className="px-2 py-1.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function AdminDashboardPage() {
  const { data: overview, isLoading: overviewLoading } = useStatsOverview();
  const { data: reportStats } = useReportStats();
  const { data: ai, isError: aiError } = useAiMetrics();
  const { data: recentPosts } = usePosts({ sort: 'latest', limit: 5 });
  const { data: recentUsers } = useAdminUsers({});
  const { data: recentReports } = useAdminReports({});

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-xl font-semibold text-text-primary">대시보드</h1>

      {/* 상단 KPI */}
      {overviewLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-card bg-bg-surface-muted" />
          ))}
        </div>
      ) : (
        overview && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="오늘 게시글" value={overview.todayPosts} />
            <StatCard label="오늘 댓글" value={overview.todayComments} />
            <StatCard label="신규 회원(오늘)" value={overview.todaySignups} />
            <StatCard label="미처리 신고" value={overview.pendingReports} />
          </div>
        )
      )}

      {/* 콘텐츠 통계 */}
      {overview && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-text-secondary">콘텐츠 통계</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatCard label="카테고리 수" value={overview.categoryCount} />
            <StatCard label="게시판 수" value={overview.boardCount} />
            <StatCard label="태그 수" value={overview.tagCount} />
          </div>
        </section>
      )}

      {/* AI 상태 */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text-secondary">AI 상태</h2>
        {aiError ? (
          <Card>
            <CardContent className="pt-5 text-sm text-text-muted">
              AI 지표를 불러오지 못했습니다. (큐/Redis 연결을 확인하세요.)
            </CardContent>
          </Card>
        ) : ai ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Queue 대기" value={ai.queue.waiting} />
            <StatCard label="Queue 처리중" value={ai.queue.active} />
            <StatCard label="Queue 실패" value={ai.queue.failed} />
            <StatCard label="Dead Letter" value={ai.deadLetterCount} />
            <StatCard label="성공률" value={ai.successRate} suffix="%" />
            <StatCard label="평균 응답" value={ai.avgResponseTimeMs} suffix="ms" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-card bg-bg-surface-muted" />
            ))}
          </div>
        )}
      </section>

      {/* 최근 활동 */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>최근 게시글</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniTable headers={['제목', '게시판', '작성']}>
              {recentPosts?.items.slice(0, 5).map((post) => (
                <tr key={post.id} className="border-b border-border-hairline last:border-0">
                  <td className="max-w-[10rem] truncate px-2 py-1.5 text-text-primary">
                    <Link href={`/boards/${post.boardSlug}/${post.id}`} className="hover:underline">
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-2 py-1.5 text-text-muted">{post.boardName}</td>
                  <td className="px-2 py-1.5 text-xs text-text-muted">{formatDate(post.createdAt)}</td>
                </tr>
              ))}
              {recentPosts?.items.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-2 py-3 text-text-muted">
                    게시글이 없습니다.
                  </td>
                </tr>
              )}
            </MiniTable>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>최근 가입 회원</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniTable headers={['닉네임', '상태', '가입']}>
              {recentUsers?.items.slice(0, 5).map((user) => (
                <tr key={user.id} className="border-b border-border-hairline last:border-0">
                  <td className="max-w-[8rem] truncate px-2 py-1.5 text-text-primary">{user.nickname}</td>
                  <td className="px-2 py-1.5 text-text-muted">{user.status}</td>
                  <td className="px-2 py-1.5 text-xs text-text-muted">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
              {recentUsers?.items.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-2 py-3 text-text-muted">
                    회원이 없습니다.
                  </td>
                </tr>
              )}
            </MiniTable>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>최근 신고</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniTable headers={['대상', '사유', '상태', '신고']}>
              {recentReports?.items.slice(0, 5).map((report) => (
                <tr key={report.id} className="border-b border-border-hairline last:border-0">
                  <td className="px-2 py-1.5 text-text-muted">{report.targetType}</td>
                  <td className="px-2 py-1.5 text-text-muted">{report.reason}</td>
                  <td className="px-2 py-1.5 text-text-primary">{report.status}</td>
                  <td className="px-2 py-1.5 text-xs text-text-muted">{formatDate(report.createdAt)}</td>
                </tr>
              ))}
              {recentReports?.items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-2 py-3 text-text-muted">
                    신고가 없습니다.
                  </td>
                </tr>
              )}
            </MiniTable>
          </CardContent>
        </Card>
      </section>

      {/* 신고 현황(기존 유지) */}
      {reportStats && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        </section>
      )}
    </div>
  );
}
