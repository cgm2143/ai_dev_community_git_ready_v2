'use client';

import { create } from 'zustand';

type Theme = 'light' | 'dark';
const THEME_COOKIE = 'devhub-theme';

function readThemeCookie(): Theme {
  if (typeof document === 'undefined') return 'light';
  const match = document.cookie.match(new RegExp(`${THEME_COOKIE}=(light|dark)`));
  return (match?.[1] as Theme) ?? 'light';
}

function applyThemeClass(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  hydrate: () => void;
}

/**
 * 5단계 UI 설계 정책: 기본값은 라이트모드, 다크모드는 헤더의 수동 토글로만 전환한다.
 * 상태는 쿠키에 저장한다(로그인 사용자는 추후 DB 설정과 동기화할 수 있도록 쿠키를 1차
 * 저장소로 두는 정책 - DB 동기화는 Users 설정 API가 프론트에 연결되는 다음 단계에서 추가한다).
 */
export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'light',
  hydrate: () => {
    const theme = readThemeCookie();
    applyThemeClass(theme);
    set({ theme });
  },
  toggle: () =>
    set((state) => {
      const next: Theme = state.theme === 'light' ? 'dark' : 'light';
      applyThemeClass(next);
      document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000`;
      return { theme: next };
    }),
}));
