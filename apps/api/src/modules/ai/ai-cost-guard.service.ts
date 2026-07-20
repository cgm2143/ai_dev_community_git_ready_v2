import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AiConfig } from '../../config/configuration';

/**
 * AI 비용 보호 장치. 일/월 예상 비용과 시간당 요청 수 한도를 초과하면 경고 로그를 남긴다.
 * 이번 단계에서는 **차단하지 않고 경고만** 한다(운영 관측 우선). 한도(config)가 0이면 비활성.
 */
@Injectable()
export class AiCostGuardService {
  private readonly config: AiConfig;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AiCostGuardService.name);
    this.config = configService.get<AiConfig>('ai') as AiConfig;
  }

  /** AI 호출 직전에 호출한다. 한도 초과 시 경고 로그만 남기고 요청 자체는 막지 않는다. */
  async warnIfExceeded(): Promise<void> {
    const { dailyCostLimit, monthlyCostLimit, requestLimitPerHour } = this.config;
    if (dailyCostLimit <= 0 && monthlyCostLimit <= 0 && requestLimitPerHour <= 0) return;

    const now = Date.now();
    const startOfDay = new Date(now - (now % 86_400_000));
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const oneHourAgo = new Date(now - 3_600_000);

    try {
      const [daily, monthly, hourlyCount] = await Promise.all([
        this.prisma.aiRequestLog.aggregate({
          _sum: { estimatedCost: true },
          where: { createdAt: { gte: startOfDay } },
        }),
        this.prisma.aiRequestLog.aggregate({
          _sum: { estimatedCost: true },
          where: { createdAt: { gte: startOfMonth } },
        }),
        this.prisma.aiRequestLog.count({ where: { createdAt: { gte: oneHourAgo } } }),
      ]);

      const dailyCost = daily._sum.estimatedCost ?? 0;
      const monthlyCost = monthly._sum.estimatedCost ?? 0;

      if (dailyCostLimit > 0 && dailyCost >= dailyCostLimit) {
        this.logger.warn({ dailyCost, dailyCostLimit }, '[CostGuard] 일일 AI 예상 비용 한도를 초과했습니다.');
      }
      if (monthlyCostLimit > 0 && monthlyCost >= monthlyCostLimit) {
        this.logger.warn({ monthlyCost, monthlyCostLimit }, '[CostGuard] 월간 AI 예상 비용 한도를 초과했습니다.');
      }
      if (requestLimitPerHour > 0 && hourlyCount >= requestLimitPerHour) {
        this.logger.warn(
          { hourlyCount, requestLimitPerHour },
          '[CostGuard] 시간당 AI 요청 수 한도를 초과했습니다.',
        );
      }
    } catch (err) {
      this.logger.warn({ err }, '[CostGuard] 사용량 조회에 실패했습니다(무시).');
    }
  }
}
