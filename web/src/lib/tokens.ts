/**
 * Crimp 디자인 토큰 (Variant A · Toss 블루).
 * 단일 진실원: `docs/design/tokens.json`. 수동 동기 — 토큰 변경 시 JSON 과 이 파일 동시 갱신.
 *
 * 사용 원칙:
 * - 새 값 하드코딩 금지. 반드시 여기서 import.
 * - 색은 `colors.light.*` / `colors.dark.*` 로 테마별 분리. 런타임 테마 스위칭은 `globals.css` 의
 *   CSS 변수(`var(--color-text)` 등) 를 우선 사용하고, 이 TS 모듈은 JS 레벨(차트·SVG 등) 에서 사용.
 */

export const colors = {
  accent: {
    base: '#3182F6',
    soft: '#E8F2FE',
    ink: '#1B64DA',
    flash: '#5B9BFF',
    on: '#FFFFFF',
  },
  light: {
    bg: '#FFFFFF',
    subtle: '#F5F7FA',
    subtle2: '#EEF1F5',
    hairline: '#E5E8EB',
    chip: '#F2F4F6',
    text: '#0F1419',
    text2: '#4E5968',
    text3: '#8B95A1',
    text4: '#B0B8C1',
  },
  dark: {
    bg: '#0D0F12',
    subtle: '#17191C',
    subtle2: '#1E2125',
    hairline: '#2A2E33',
    chip: '#1E2125',
    text: '#F7F8F9',
    text2: '#B0B8C1',
    text3: '#8B95A1',
    text4: '#5A6470',
  },
  semantic: {
    success: '#12B886',
    warning: '#FAB005',
    danger: '#E03131',
    info: '#3182F6',
  },
  hold: {
    red: '#E03131',
    blue: '#1C7ED6',
    yellow: '#F59F00',
    green: '#2F9E44',
    white: '#F8F9FA',
    black: '#212529',
    pink: '#E64980',
    orange: '#F76707',
    purple: '#7048E8',
    gray: '#868E96',
  },
} as const;

/**
 * V-스케일 그레이드 뱃지 배경.
 * oklch 를 지원하지 않는 렌더러가 있으면 RGB fallback 이 필요 (SVG 썸네일 등).
 */
export const gradeStops = [
  { v: 'V0', hue: 208, l: 92 },
  { v: 'V1', hue: 208, l: 85 },
  { v: 'V2', hue: 210, l: 72 },
  { v: 'V3', hue: 212, l: 58 },
  { v: 'V4', hue: 214, l: 45 },
  { v: 'V5', hue: 216, l: 36 },
  { v: 'V6', hue: 218, l: 28 },
  { v: 'V7', hue: 220, l: 22 },
  { v: 'V8', hue: 222, l: 18 },
  { v: 'V9', hue: 224, l: 14 },
  { v: 'V10', hue: 226, l: 11 },
] as const;

export function gradeTint(v: string): { bg: string; fg: string } {
  const stop = gradeStops.find((g) => g.v === v) ?? gradeStops[0]!;
  return {
    bg: `oklch(${stop.l}% 0.06 ${stop.hue})`,
    fg: stop.l > 50 ? '#0F1419' : '#FFFFFF',
  };
}

export const fonts = {
  sans: '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif',
  mono: 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',
} as const;

export const fontSize = {
  caption: '12px',
  body: '15px',
  title: '18px',
  h2: '24px',
  h1: '32px',
  display: '72px',
  hero: '120px',
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

export const letterSpacing = {
  caption: '0em',
  body: '-0.01em',
  title: '-0.02em',
  h2: '-0.03em',
  h1: '-0.04em',
  display: '-0.05em',
  hero: '-0.06em',
} as const;

export const lineHeight = {
  tight: 0.95,
  snug: 1.15,
  normal: 1.5,
  relaxed: 1.65,
} as const;

export const space = {
  0: '0px',
  0.5: '2px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  14: '56px',
  20: '80px',
} as const;

export const radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '28px',
  full: '9999px',
} as const;

export const shadow = {
  none: 'none',
  xs: '0 1px 2px rgba(15,20,25,0.04), 0 2px 8px rgba(15,20,25,0.04)',
  sm: '0 4px 16px rgba(15,20,25,0.08)',
  lg: '0 20px 60px rgba(15,20,25,0.18)',
  darkXs: '0 1px 2px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
  darkSm: '0 4px 16px rgba(0,0,0,0.3)',
  darkLg: '0 20px 60px rgba(0,0,0,0.6)',
} as const;

export const motion = {
  duration: { fast: '200ms', normal: '300ms', slow: '450ms' },
  easing: { standard: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
  spring: { stiffness: 180, damping: 20 },
} as const;

export const touchTarget = { min: 44 } as const;

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
} as const;
