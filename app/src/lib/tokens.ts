/**
 * Crimp 디자인 토큰 (Variant A · Toss 블루) — React Native.
 * 단일 진실원: `docs/design/tokens.json`. 수동 동기.
 *
 * 사용 원칙:
 * - 새 값 하드코딩 금지. 컴포넌트는 `useTokens()` 또는 직접 import.
 * - 테마: 시스템 Appearance 에 따라 `useTokens()` 가 자동 선택.
 * - `shadow.*` 는 iOS `shadow*` + Android `elevation` 조합. 필요 시 Platform.select 로 사용.
 */

import { Platform } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

const accent = {
  base: '#3182F6',
  soft: '#E8F2FE',
  ink: '#1B64DA',
  flash: '#5B9BFF',
} as const;

const semantic = {
  success: '#12B886',
  warning: '#FAB005',
  danger: '#E03131',
} as const;

const hold = {
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
} as const;

type NeutralPalette = {
  bg: string;
  subtle: string;
  subtle2: string;
  hairline: string;
  chip: string;
  text: string;
  text2: string;
  text3: string;
  text4: string;
};

const lightTheme: NeutralPalette = {
  bg: '#FFFFFF',
  subtle: '#F5F7FA',
  subtle2: '#EEF1F5',
  hairline: '#E5E8EB',
  chip: '#F2F4F6',
  text: '#0F1419',
  text2: '#4E5968',
  text3: '#8B95A1',
  text4: '#B0B8C1',
};

const darkTheme: NeutralPalette = {
  bg: '#0D0F12',
  subtle: '#17191C',
  subtle2: '#1E2125',
  hairline: '#2A2E33',
  chip: '#1E2125',
  text: '#F7F8F9',
  text2: '#B0B8C1',
  text3: '#8B95A1',
  text4: '#5A6470',
};

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

/**
 * RN 은 oklch 를 렌더링하지 못하므로 각 스텝을 HSL → sRGB 근사로 변환한 hex 로 제공.
 * (웹은 oklch 원본 사용; 두 플랫폼 출력이 지각적으로 근접하도록 튜닝된 값.)
 */
export const gradeHex: Record<string, { bg: string; fg: string }> = {
  V0: { bg: '#DDE5ED', fg: '#0F1419' },
  V1: { bg: '#C4D0DC', fg: '#0F1419' },
  V2: { bg: '#9BB1C6', fg: '#0F1419' },
  V3: { bg: '#6F8CA7', fg: '#FFFFFF' },
  V4: { bg: '#4F6A85', fg: '#FFFFFF' },
  V5: { bg: '#3A5170', fg: '#FFFFFF' },
  V6: { bg: '#2B3E5A', fg: '#FFFFFF' },
  V7: { bg: '#213048', fg: '#FFFFFF' },
  V8: { bg: '#1A273B', fg: '#FFFFFF' },
  V9: { bg: '#131E2E', fg: '#FFFFFF' },
  V10: { bg: '#0F1726', fg: '#FFFFFF' },
};

export function gradeTint(v: string): { bg: string; fg: string } {
  return gradeHex[v] ?? gradeHex.V0!;
}

export const fontFamily = Platform.select({
  ios: 'Pretendard Variable',
  android: 'Pretendard-Regular',
  default: 'Pretendard',
}) as string;

export const fontSize = {
  caption: 12,
  body: 15,
  title: 18,
  h2: 24,
  h1: 32,
  display: 56,
  hero: 72,
} as const;

export const fontWeight: Record<
  'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold',
  TextStyle['fontWeight']
> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export const letterSpacing = {
  caption: 0,
  body: -0.15,
  title: -0.36,
  h2: -0.72,
  h1: -1.28,
  display: -2.8,
  hero: -4.32,
} as const;

export const lineHeight = {
  tight: 0.95,
  snug: 1.15,
  normal: 1.5,
  relaxed: 1.65,
} as const;

export const space = {
  0: 0,
  0.5: 2,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  14: 56,
  20: 80,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  full: 9999,
} as const;

type ShadowStyle = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

export const shadow: Record<'xs' | 'sm' | 'lg', ShadowStyle> = {
  xs: {
    shadowColor: '#0F1419',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0F1419',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F1419',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 16,
  },
};

export const motion = {
  duration: { fast: 200, normal: 300, slow: 450 },
  spring: { stiffness: 180, damping: 20 },
} as const;

export const touchTarget = { min: 44 } as const;

export type Theme = {
  bg: string;
  subtle: string;
  subtle2: string;
  hairline: string;
  chip: string;
  text: string;
  text2: string;
  text3: string;
  text4: string;
  accent: typeof accent;
  semantic: typeof semantic;
  hold: typeof hold;
  mode: 'light' | 'dark';
};

export function makeTheme(mode: 'light' | 'dark'): Theme {
  const base = mode === 'dark' ? darkTheme : lightTheme;
  return { ...base, accent, semantic, hold, mode };
}

export const themeLight = makeTheme('light');
export const themeDark = makeTheme('dark');
