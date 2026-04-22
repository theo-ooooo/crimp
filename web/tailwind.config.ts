import type { Config } from 'tailwindcss';

/**
 * Tailwind 는 `docs/design/tokens.json` 의 일부 값을 그대로 재노출.
 * 색상은 CSS 변수 경유 (`bg-accent` → `var(--color-accent)`) 로 라이트/다크 모드 자동 전환.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: 'var(--color-accent)',
          soft: 'var(--color-accent-soft)',
          ink: 'var(--color-accent-ink)',
          flash: 'var(--color-accent-flash)',
        },
        bg: 'var(--color-bg)',
        subtle: 'var(--color-subtle)',
        'subtle-2': 'var(--color-subtle-2)',
        hairline: 'var(--color-hairline)',
        chip: 'var(--color-chip)',
        text: {
          DEFAULT: 'var(--color-text)',
          2: 'var(--color-text-2)',
          3: 'var(--color-text-3)',
          4: 'var(--color-text-4)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
      },
      fontFamily: {
        sans: [
          '"Pretendard Variable"',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          '"Helvetica Neue"',
          '"Segoe UI"',
          '"Apple SD Gothic Neo"',
          '"Noto Sans KR"',
          '"Malgun Gothic"',
          'sans-serif',
        ],
        mono: ['ui-monospace', '"SF Mono"', '"JetBrains Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        caption: ['12px', { lineHeight: '1.5', letterSpacing: '0em' }],
        body: ['15px', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        title: ['18px', { lineHeight: '1.3', letterSpacing: '-0.02em' }],
        h2: ['24px', { lineHeight: '1.2', letterSpacing: '-0.03em' }],
        h1: ['32px', { lineHeight: '1.15', letterSpacing: '-0.04em' }],
        display: ['72px', { lineHeight: '0.95', letterSpacing: '-0.05em' }],
        hero: ['120px', { lineHeight: '0.9', letterSpacing: '-0.06em' }],
      },
      spacing: {
        '0.5': '2px',
        '14': '56px',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '28px',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        lg: 'var(--shadow-lg)',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      transitionDuration: {
        fast: '200ms',
        normal: '300ms',
        slow: '450ms',
      },
    },
  },
  plugins: [],
};

export default config;
