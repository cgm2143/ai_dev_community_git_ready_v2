import type { Config } from 'tailwindcss';

/**
 * 5단계 UI 디자인 문서(05_ui_design.md)에서 확정한 디자인 토큰을 그대로 반영한다.
 * 실제 색상 값은 globals.css의 CSS 변수(라이트/다크 각각)에 정의되어 있고,
 * 여기서는 그 변수를 Tailwind 유틸리티 클래스(bg-surface, text-primary 등)로만 연결한다.
 */
const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          page: 'var(--bg-page)',
          surface: 'var(--bg-surface)',
          'surface-muted': 'var(--bg-surface-muted)',
          'surface-raised': 'var(--bg-surface-raised)',
        },
        border: {
          hairline: 'var(--border-hairline)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        accent: {
          'primary-tint': 'var(--accent-primary-tint)',
          primary: 'var(--accent-primary)',
          'primary-strong': 'var(--accent-primary-strong)',
          amber: 'var(--accent-amber)',
          danger: 'var(--accent-danger)',
          'ai-teal': 'var(--accent-ai-teal)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        xs: ['12px', '1.4'],
        sm: ['13px', '1.4'],
        base: ['14px', '1.55'],
        lg: ['16px', '1.5'],
        xl: ['20px', '1.4'],
        '2xl': ['24px', '1.35'],
        '3xl': ['32px', '1.25'],
      },
      borderRadius: {
        card: '12px',
      },
      spacing: {
        sidebar: '240px',
        aside: '280px',
      },
      keyframes: {
        'pulse-bar': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'pulse-bar': 'pulse-bar 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
};

export default config;
