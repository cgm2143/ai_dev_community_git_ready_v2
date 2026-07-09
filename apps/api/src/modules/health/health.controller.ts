import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../../../package.json') as { version: string };

interface DependencyCheck {
  status: 'up' | 'down';
  latencyMs: number;
}

/**
 * Docker/오케스트레이션 헬스체크 및 로드밸런서 프로브용 엔드포인트.
 * DB/Redis 연결뿐 아니라 메모리 사용량, 버전, uptime까지 함께 노출해
 * 운영 중 장애 진단(OOM 조짐, 배포 버전 확인 등)에 바로 활용할 수 있게 한다.
 * Swagger 문서에는 노출하지 않는다(운영 노이즈 방지).
 */
@ApiExcludeController()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  async check(@Res() res: Response): Promise<void> {
    const [database, redisCheck] = await Promise.all([this.checkDatabase(), this.checkRedis()]);

    const isHealthy = database.status === 'up' && redisCheck.status === 'up';

    const body = {
      status: isHealthy ? 'ok' : 'degraded',
      version: packageJson.version,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: {
        database,
        redis: redisCheck,
      },
      memory: this.getMemoryUsage(),
    };

    // 오케스트레이션 도구(k8s liveness/readiness 등)가 실패를 인지할 수 있도록
    // 의존성 이상 시 실제 HTTP 상태 코드도 503으로 내려준다.
    res.status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(body);
  }

  private async checkDatabase(): Promise<DependencyCheck> {
    const start = process.hrtime.bigint();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', latencyMs: this.elapsedMs(start) };
    } catch {
      return { status: 'down', latencyMs: this.elapsedMs(start) };
    }
  }

  private async checkRedis(): Promise<DependencyCheck> {
    const start = process.hrtime.bigint();
    try {
      const pong = await this.redis.client.ping();
      return { status: pong === 'PONG' ? 'up' : 'down', latencyMs: this.elapsedMs(start) };
    } catch {
      return { status: 'down', latencyMs: this.elapsedMs(start) };
    }
  }

  private elapsedMs(start: bigint): number {
    return Math.round(Number(process.hrtime.bigint() - start) / 1_000_000);
  }

  private getMemoryUsage() {
    const usage = process.memoryUsage();
    const toMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

    return {
      rssMb: toMb(usage.rss),
      heapUsedMb: toMb(usage.heapUsed),
      heapTotalMb: toMb(usage.heapTotal),
      externalMb: toMb(usage.external),
    };
  }
}
