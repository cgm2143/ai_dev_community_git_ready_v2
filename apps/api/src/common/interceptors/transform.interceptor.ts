import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

interface PaginatedShape<T> {
  items: T[];
  meta: { page: number; limit: number; total: number };
}

function isPaginatedShape<T>(value: unknown): value is PaginatedShape<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'items' in value &&
    'meta' in value &&
    Array.isArray((value as { items: unknown }).items)
  );
}

/**
 * 모든 성공 응답을 { success: true, data, meta? } 포맷으로 감싼다.
 * 도메인 서비스가 목록 조회 시 { items, meta } 형태를 반환하면 자동으로 data/meta로 분리한다.
 * 파일 다운로드, 스트리밍 등 예외적인 응답은 컨트롤러에서 @Res() 로 직접 처리하고 이 인터셉터 대상에서 제외한다.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    return next.handle().pipe(
      map((result) => {
        if (isPaginatedShape<T>(result)) {
          return { success: true, data: result.items, meta: result.meta };
        }
        return { success: true, data: result };
      }),
    );
  }
}
