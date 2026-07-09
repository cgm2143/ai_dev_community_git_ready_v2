import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-error';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: (failureCount, error) => {
          // 인증/권한/데이터 없음 오류는 재시도해도 결과가 같으므로 재시도하지 않는다.
          if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
            return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}
