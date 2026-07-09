import { create } from 'zustand';

export interface AuthUser {
  id: string;
  nickname: string;
  email: string;
  role: string;
  emailVerified: boolean;
  profileImageUrl: string | null;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  /** 최초 진입 시 /auth/refresh로 세션 복구를 시도하는 동안 true. 이 값으로 로그인 여부 판단을 유예한다. */
  isBootstrapping: boolean;
  setSession: (accessToken: string, user: AuthUser) => void;
  clearSession: () => void;
  setBootstrapped: () => void;
}

/**
 * Access Token은 절대 localStorage/쿠키가 아닌 메모리(이 스토어)에만 보관한다.
 * localStorage에 두면 XSS 공격 시 토큰이 그대로 탈취되기 때문이다. 대신 페이지를 새로고침하면
 * 메모리가 초기화되므로, 앱 최초 마운트 시(AuthProvider) 항상 한 번 /auth/refresh를 호출해
 * HttpOnly Refresh Token 쿠키로 새 Access Token을 재발급받아 세션을 복구한다.
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isBootstrapping: true,
  setSession: (accessToken, user) => set({ accessToken, user }),
  clearSession: () => set({ accessToken: null, user: null }),
  setBootstrapped: () => set({ isBootstrapping: false }),
}));

/** React 컴포넌트 밖(api-client 인터셉터 등)에서 현재 토큰을 읽기 위한 헬퍼. */
export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken;
}
