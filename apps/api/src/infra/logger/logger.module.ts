import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';

interface RequestWithAuth extends IncomingMessage {
  user?: { id: string };
}

/**
 * nestjs-pino 기반 구조화 로깅.
 * - 운영 환경(JSON) / 개발 환경(pino-pretty) 자동 전환
 * - 요청마다 requestId를 발급/전파해 분산 환경에서도 요청 단위 추적 가능
 * - 인증된 요청은 userId를 로그에 함께 남겨 "누가" 요청했는지 추적 가능
 * - responseTime(ms)은 pino-http가 완료 로그에 기본으로 포함한다
 * - 헬스체크 등 로그 소음이 큰 엔드포인트는 제외
 */
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('app.nodeEnv');
        const isProd = nodeEnv === 'production';

        return {
          pinoHttp: {
            level: isProd ? 'info' : 'debug',
            transport: isProd
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: { singleLine: true, colorize: true },
                },
            genReqId: (req: { headers: Record<string, string | string[] | undefined> }) =>
              req.headers['x-request-id'] ?? randomUUID(),
            // 완료 로그(request completed)에 requestId/userId를 최상위 필드로 노출해
            // 로그 수집기(예: Loki, CloudWatch)에서 바로 필터링/집계할 수 있게 한다.
            customProps: (req: RequestWithAuth, _res: ServerResponse) => ({
              requestId: req.id,
              userId: req.user?.id ?? null,
            }),
            autoLogging: {
              ignore: (req: { url?: string }) => req.url === '/health' || req.url === '/v1/health',
            },
            redact: {
              paths: ['req.headers.authorization', 'req.headers.cookie'],
              censor: '***',
            },
          },
        };
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}

