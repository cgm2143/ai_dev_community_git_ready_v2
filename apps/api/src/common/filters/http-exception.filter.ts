import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { ErrorCode } from '../constants/error-codes';

interface NormalizedErrorBody {
  code: string;
  message: string;
  details: unknown;
}

/**
 * 애플리케이션에서 발생하는 모든 예외를 공통 응답 포맷으로 변환한다.
 * {
 *   "success": false,
 *   "error": { "code": "...", "message": "...", "details": null },
 *   "timestamp": "2026-07-07T12:00:00.000Z"
 * }
 *
 * - AppException(HttpException 하위)이 던진 { code, message, details } 형태는 그대로 사용
 * - class-validator ValidationPipe가 던지는 BadRequestException은 VALIDATION_ERROR로 정규화
 * - 그 외 처리되지 않은 에러는 500 + INTERNAL_SERVER_ERROR 로 감싸고, 원본은 로그에만 남긴다 (스택 트레이스 미노출)
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(HttpExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.normalize(exception);

    if (status >= 500) {
      this.logger.error({ err: exception, path: request.url, method: request.method }, 'Unhandled exception');
    } else {
      this.logger.warn({ code: body.code, path: request.url, method: request.method }, body.message);
    }

    // details.retryAfterSeconds가 있으면(예: 이메일 재발송 쿨다운) 표준 Retry-After 헤더로도 노출해,
    // 클라이언트가 body를 파싱하지 않고도(혹은 클라이언트 라이브러리 레벨에서) 재시도 시점을 알 수 있게 한다.
    const retryAfterSeconds = this.extractRetryAfterSeconds(body.details);
    if (retryAfterSeconds !== null) {
      response.set('Retry-After', String(retryAfterSeconds));
    }

    response.status(status).json({
      success: false,
      error: body,
      timestamp: new Date().toISOString(),
    });
  }

  private extractRetryAfterSeconds(details: unknown): number | null {
    if (
      typeof details === 'object' &&
      details !== null &&
      'retryAfterSeconds' in details &&
      typeof (details as { retryAfterSeconds: unknown }).retryAfterSeconds === 'number'
    ) {
      return (details as { retryAfterSeconds: number }).retryAfterSeconds;
    }
    return null;
  }

  private normalize(exception: unknown): { status: number; body: NormalizedErrorBody } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      // AppException 등, 이미 { code, message, details } 형태로 던져진 경우 그대로 사용
      if (this.isNormalizedPayload(payload)) {
        return { status, body: payload };
      }

      // class-validator ValidationPipe의 기본 BadRequestException 형태: { message: string[], error, statusCode }
      if (status === HttpStatus.BAD_REQUEST) {
        const message = this.extractValidationMessage(payload);
        return {
          status,
          body: { code: ErrorCode.VALIDATION_ERROR, message, details: payload },
        };
      }

      const message = typeof payload === 'string' ? payload : exception.message;
      return {
        status,
        body: { code: this.fallbackCodeForStatus(status), message, details: null },
      };
    }

    // Prisma, TypeError 등 완전히 예상 밖의 에러
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: '서버에 예상치 못한 오류가 발생했습니다.',
        details: null,
      },
    };
  }

  private isNormalizedPayload(payload: unknown): payload is NormalizedErrorBody {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'code' in payload &&
      'message' in payload
    );
  }

  private extractValidationMessage(payload: unknown): string {
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      Array.isArray((payload as { message: unknown }).message)
    ) {
      return ((payload as { message: string[] }).message)[0] ?? '입력값이 올바르지 않습니다.';
    }
    return '입력값이 올바르지 않습니다.';
  }

  private fallbackCodeForStatus(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.RESOURCE_NOT_FOUND;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMIT_EXCEEDED;
      default:
        return ErrorCode.INTERNAL_SERVER_ERROR;
    }
  }
}
