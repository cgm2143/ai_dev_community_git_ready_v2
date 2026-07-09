import { Injectable } from '@nestjs/common';
import { PostStatus, ReportStatus, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalUsers, activeUsers, todaySignups, totalPosts, totalComments, pendingReports] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
        this.prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
        this.prisma.post.count({ where: { status: PostStatus.PUBLISHED, deletedAt: null } }),
        this.prisma.comment.count({ where: { deletedAt: null } }),
        this.prisma.report.count({ where: { status: ReportStatus.PENDING } }),
      ]);

    return { totalUsers, activeUsers, todaySignups, totalPosts, totalComments, pendingReports };
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
