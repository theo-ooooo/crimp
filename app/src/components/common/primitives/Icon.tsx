import React, { useMemo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { fontFamily } from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';

/**
 * Icon — react-native-svg 미설치 환경 폴백.
 *
 * 현재 앱 번들에 `react-native-svg` 가 없으므로 각 아이콘을 단일 유니코드 글리프 +
 * 경량 View 로 근사한다. API (name/size/color/fill) 는 향후 SVG 로 교체해도 변경 없이
 * 유지 가능하도록 유지한다.
 */

export type IconProps = {
  size?: number;
  color?: string;
  fill?: boolean;
};

type IconDef = {
  /** 1자 또는 짧은 문자열 — 시스템 폰트에서 안정적으로 렌더되는 것만 사용 */
  glyph: string;
  /** glyph 를 container 대비 얼마나 키울지 (기본 0.62) */
  scale?: number;
  /**
   * fill prop 이 true 일 때 사용할 별도 글리프. 정의되어 있으면 글리프 자체를 채워진
   * 모양으로 교체하고 컨테이너 배경은 칠하지 않는다 (예: 빈 하트 ♡ → 채운 하트 ♥).
   * 정의 없으면 컨테이너 배경 페인트 폴백 (기존 동작).
   */
  fillGlyph?: string;
};

/**
 * 모든 글리프는 **모노크롬 텍스트 Unicode** 만 사용 (BMP ≤ U+2FFF Miscellaneous
 * Symbols / Geometric Shapes 등). iOS·Android 모두 `color` prop 이 적용되어
 * 다크 모드·탭바·액티브 상태에서 색이 정상 반영된다.
 * 이모지 글리프(U+1F5xx 등) 는 시스템이 풀컬러로 렌더해 `color` 를 무시하므로 금지.
 */
const iconDefs = {
  bell: { glyph: '\u25C9', scale: 0.85 }, // ◉ fisheye — 알림 점
  search: { glyph: '\u2315', scale: 0.95 }, // ⌕ 검색
  plus: { glyph: '+', scale: 0.9 },
  chevR: { glyph: '\u203A', scale: 0.95 },
  chevL: { glyph: '\u2039', scale: 0.95 },
  close: { glyph: '\u2715', scale: 0.72 },
  edit: { glyph: '\u270E', scale: 0.72 },
  home: { glyph: '\u2302', scale: 0.9 },
  map: { glyph: '\u29C9', scale: 0.9 }, // ⧉ 두 사각형
  feed: { glyph: '\u25A4', scale: 0.85 },
  profile: { glyph: '\u263B', scale: 0.8 },
  clock: { glyph: '\u25F7', scale: 0.95 }, // ◷ 시계 사분면
  pin: { glyph: '\u2691', scale: 0.85 }, // ⚑ 플래그
  play: { glyph: '\u25B6', scale: 0.72 },
  flame: { glyph: '\u25B4', scale: 0.9 }, // ▴ 상승 삼각 (불꽃 추상)
  check: { glyph: '\u2713', scale: 0.9 },
  filter: { glyph: '\u2263', scale: 0.85 },
  trend: { glyph: '\u2197', scale: 0.9 },
  dots: { glyph: '\u22EF', scale: 0.95 },
  flip: { glyph: '\u21BB', scale: 0.95 }, // 카메라 flip
  target: { glyph: '\u25CE', scale: 0.9 },
  heart: { glyph: '\u2661', fillGlyph: '\u2665', scale: 0.95 }, // ♡ → ♥ (fill)
  chat: { glyph: '\u2750', scale: 0.85 }, // ❐ 말풍선 근사 (모노크롬 박스)
} as const satisfies Record<string, IconDef>;

export type IconName = keyof typeof iconDefs;

function createIcon(name: IconName) {
  return function Icon({ size = 24, color, fill = false }: IconProps): JSX.Element {
    const theme = useTokens();
    // `as IconDef` — `as const satisfies` 가 각 항목을 좁은 literal 타입으로 두는 탓에
    // optional `fillGlyph` 접근 시 TS 가 실패. 공통 IconDef 로 widening 하여 안전 접근.
    const def = iconDefs[name] as IconDef;
    const scale = def.scale ?? 0.62;
    const fg = color ?? theme.text;
    const styles = useMemo(() => makeStyles(size, scale), [size, scale]);

    // fillGlyph 가 정의된 아이콘 (예: heart ♡→♥) 은 글리프 교체로 채움 표현.
    // 그렇지 않으면 컨테이너 배경 페인트 폴백.
    const fillGlyph = def.fillGlyph;
    const useGlyphSwap = fill && fillGlyph !== undefined;
    const containerStyle: ViewStyle | null =
      fill && !useGlyphSwap
        ? { backgroundColor: fg, borderRadius: size * 0.2 }
        : null;
    const glyphColor = fill && !useGlyphSwap ? theme.bg : fg;
    const renderedGlyph = useGlyphSwap && fillGlyph ? fillGlyph : def.glyph;

    return (
      <View
        style={[styles.container, containerStyle]}
        accessibilityRole="image"
        accessibilityLabel={name}
      >
        <Text
          allowFontScaling={false}
          style={[styles.glyph, { color: glyphColor }]}
        >
          {renderedGlyph}
        </Text>
      </View>
    );
  };
}

function makeStyles(size: number, scale: number) {
  return StyleSheet.create({
    container: {
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
    },
    glyph: {
      fontFamily,
      fontSize: size * scale,
      lineHeight: size,
      includeFontPadding: false,
      textAlign: 'center',
    },
  });
}

export const CrimpIcon: Record<IconName, (props: IconProps) => JSX.Element> = {
  bell: createIcon('bell'),
  search: createIcon('search'),
  plus: createIcon('plus'),
  chevR: createIcon('chevR'),
  chevL: createIcon('chevL'),
  close: createIcon('close'),
  edit: createIcon('edit'),
  home: createIcon('home'),
  map: createIcon('map'),
  feed: createIcon('feed'),
  profile: createIcon('profile'),
  clock: createIcon('clock'),
  pin: createIcon('pin'),
  play: createIcon('play'),
  flame: createIcon('flame'),
  check: createIcon('check'),
  filter: createIcon('filter'),
  trend: createIcon('trend'),
  dots: createIcon('dots'),
  flip: createIcon('flip'),
  target: createIcon('target'),
  heart: createIcon('heart'),
  chat: createIcon('chat'),
};
