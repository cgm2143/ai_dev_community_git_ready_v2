import { ApiError, type ApiErrorBody } from './api-error';
import { getAccessToken, useAuthStore, type AuthUser } from '@/stores/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const API_PREFIX = '/v1';

export interface AuthSessionResponse {
  accessToken: string;
  user: AuthUser;
}

interface ApiSuccessBody<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * 동시에 여러 요청이 401을 받아도 /auth/refresh는 한 번만 호출되도록 진행 중인 Promise를 공유한다
 * (예: 페이지 진입 직후 여러 위젯이 동시에 데이터를 요청하는 경우).
 */
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}${API_PREFIX}/auth/refresh`, {
          method: 'POST',
          credentials: 'include', // HttpOnly Refresh Token 쿠키를 함께 전송
        });
        if (!res.ok) return null;

        const body = (await res.json()) as ApiSuccessBody<AuthSessionResponse>;
        useAuthStore.getState().setSession(body.data.accessToken, body.data.user);
        return body.data.accessToken;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

/**
 * 모든 API 호출이 거치는 단일 진입점.
 * - Access Token은 메모리(auth-store)에서 읽어 Authorization 헤더로 붙인다.
 * - 401을 받으면 Refresh Token 쿠키로 조용히 한 번 재발급을 시도한 뒤, 성공하면 원래 요청을 재시도한다.
 * - 재발급도 실패하면 세션을 정리한다(로그인 화면으로의 리다이렉트는 호출부/AuthProvider가 처리).
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;
  if (!headers.has('Content-Type') && options.body && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(path, options, true);
    }
    useAuthStore.getState().clearSession();
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.success) {
    const errorBody: ApiErrorBody = body ?? {
      success: false,
      error: { code: 'UNKNOWN_ERROR', message: '요청 처리 중 문제가 발생했습니다.' },
      timestamp: new Date().toISOString(),
    };
    throw new ApiError(res.status, errorBody);
  }

  return (body as ApiSuccessBody<T>).data;
}

/** multipart/form-data 업로드 전용 - Content-Type을 브라우저가 boundary와 함께 자동 설정하도록 절대 지정하지 않는다. */
export function apiFetchMultipart<T>(path: string, formData: FormData): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: formData });
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: 'DELETE', body: data !== undefined ? JSON.stringify(data) : undefined }),
};

export { refreshAccessToken };
