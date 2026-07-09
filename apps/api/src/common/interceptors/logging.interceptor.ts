import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { tap } from 'rxjs';
import { AuthenticatedUser } from '../../modules/auth/types/jwt-payload.interface';

interface RequestWithAuth extends Request {
  user?: AuthenticatedUser;
}

/**
 * nestjs-pino의 자동 HTTP 로깅과 별개로, 애플리케이션 레벨의 요청 처리 로그를 남긴다.
 * requestId/userId/responseTime을 함께 남겨, 특정 사용자의 특정 요청이 어떤 흐름으로
 * 처리됐는지(요청 -> 응답) 하나의 requestId로 추적할 수 있게 한다.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(LoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const { method, url } = request;
    const start = process.hrtime.bigint();

    return next.handle().pipe(
      tap(() => {
        const responseTimeMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        this.logger.info(
          {
            requestId: request.id,
            userId: request.user?.id ?? null,
            method,
            url,
            responseTimeMs: Math.round(responseTimeMs * 100) / 100,
          },
          'request handled',
        );
      }),
    );
  }
}

