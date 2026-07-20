import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AI_SUMMARY_QUEUE } from '../../../infra/queue/ai-summary.constants';
import { DeadLetterService } from '../../../infra/queue/dead-letter.service';

/**
 * AI 운영 지표 집계. AiRequestLog(관측 로그) + 큐 상태 + DLQ를 조합해 관리자 대시보드용 수치를 만든다.
 * (UI는 미구현 — API만 제공)
 */
@Injectable()
export class AdminAiMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_SUMMARY_QUEUE) private readonly aiSummaryQueue: Queue,
    private readonly deadLetterService: DeadLetterService,
  ) {}

  async getMetrics() {
    const now = Date.now();
    const startOfDay = new Date(now - (now % 86_400_000));
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [overall, successCount, cacheHitCount, todaySum, monthSum, byProvider, queueCounts, deadLetterCount] =
      await Promise.all([
        this.prisma.aiRequestLog.aggregate({
          _count: { _all: true },
          _avg: { responseTimeMs: true, totalTokens: true },
        }),
        this.prisma.aiRequestLog.count({ where: { success: true } }),
        this.prisma.aiRequestLog.count({ where: { cacheHit: true } }),
        this.prisma.aiRequestLog.aggregate({ _sum: { estimatedCost: true }, where: { createdAt: { gte: startOfDay } } }),
        this.prisma.aiRequestLog.aggregate({
          _sum: { estimatedCost: true },
          where: { createdAt: { gte: startOfMonth } },
        }),
        this.prisma.aiRequestLog.groupBy({ by: ['provider'], _count: { _all: true } }),
        this.aiSummaryQueue.getJobCounts('waiting', 'active', 'delayed', 'failed'),
        this.deadLetterService.countDeadLetters(),
      ]);

    const total = overall._count._all;
    const successRate = total > 0 ? Math.round((successCount / total) * 1000) / 10 : 0;

    return {
      totalRequests: total,
      successRate, // %
      failureRate: total > 0 ? Math.round((1000 - successRate * 10)) / 10 : 0,
      avgResponseTimeMs: Math.round(overall._avg.responseTimeMs ?? 0),
      avgTotalTokens: Math.round(overall._avg.totalTokens ?? 0),
      todayCost: todaySum._sum.estimatedCost ?? 0,
      monthCost: monthSum._sum.estimatedCost ?? 0,
      providerDistribution: byProvider.map((row) => ({ provider: row.provider, count: row._count._all })),
      cacheHitCount,
      queue: {
        name: this.aiSummaryQueue.name,
        waiting: queueCounts.waiting ?? 0,
        active: queueCounts.active ?? 0,
        delayed: queueCounts.delayed ?? 0,
        failed: queueCounts.failed ?? 0,
      },
      deadLetterCount,
    };
  }
}
