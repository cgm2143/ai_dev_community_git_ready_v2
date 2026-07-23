import { Injectable } from '@nestjs/common';
import { PostStatus, ReportStatus, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 기존 필드(회원/게시글/댓글/미처리신고)에 대시보드용 count를 additive로만 추가한다.
    // 새 필드: 오늘 게시글/댓글, 콘텐츠 규모(카테고리/게시판/태그).
    const [
      totalUsers,
      activeUsers,
      todaySignups,
      totalPosts,
      totalComments,
      pendingReports,
      todayPosts,
      todayComments,
      categoryCount,
      boardCount,
      tagCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.post.count({ where: { status: PostStatus.PUBLISHED, deletedAt: null } }),
      this.prisma.comment.count({ where: { deletedAt: null } }),
      this.prisma.report.count({ where: { status: ReportStatus.PENDING } }),
      this.prisma.post.count({
        where: { status: PostStatus.PUBLISHED, deletedAt: null, createdAt: { gte: startOfToday } },
      }),
      this.prisma.comment.count({ where: { deletedAt: null, createdAt: { gte: startOfToday } } }),
      this.prisma.category.count(),
      this.prisma.board.count(),
      this.prisma.tag.count(),
    ]);

    return {
      totalUsers,
      activeUsers,
      todaySignups,
      totalPosts,
      totalComments,
      pendingReports,
      todayPosts,
      todayComments,
      categoryCount,
      boardCount,
      tagCount,
    };
  }

  /** 9단계(Report)에서 예고했던 신고 통계: 미처리 수, 유형별, 처리 현황, 최다 신고 대상. */
  async getReportStats() {
    const [byReason, byStatus, topTargets] = await Promise.all([
      this.prisma.report.groupBy({ by: ['reason'], _count: { _all: true } }),
      this.prisma.report.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.report.groupBy({
        by: ['targetType', 'targetId'],
        _count: { _all: true },
        orderBy: { _count: { targetId: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      byReason: byReason.map((row) => ({ reason: row.reason, count: row._count._all })),
      byStatus: byStatus.map((row) => ({ status: row.status, count: row._count._all })),
      topReportedTargets: topTargets.map((row) => ({
        targetType: row.targetType,
        targetId: row.targetId,
        reportCount: row._count._all,
      })),
    };
  }
}
