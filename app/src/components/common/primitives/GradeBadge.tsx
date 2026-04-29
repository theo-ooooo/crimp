import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { fontFamily, gradeTint } from '@/lib/tokens';

// iOS 전용 tabular-nums. Android 는 비례폭 숫자로 렌더링 (시각 차이 미미).
const TABULAR_NUMS = Platform.select<Array<'tabular-nums'>>({
  ios: ['tabular-nums'],
  android: [],
  default: [],
}) as Array<'tabular-nums'>;

export type GradeSize = 'sm' | 'md' | 'lg';

export type GradeBadgeProps = {
  v: string;
  size?: GradeSize;
  accessibilityLabel?: string;
};

const sizeMap: Record<GradeSize, { w: number; h: number; fs: number }> = {
  sm: { w: 36, h: 22, fs: 12 },
  md: { w: 44, h: 26, fs: 14 },
  lg: { w: 56, h: 34, fs: 18 },
};

function makeStyles(bg: string, fg: string, w: number, h: number, fs: number) {
  return StyleSheet.create({
    container: {
      width: w,
      height: h,
      borderRadius: h / 2,
      backgroundColor: bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      color: fg,
      fontFamily,
      fontSize: fs,
      fontWeight: '800',
      letterSpacing: -(fs * 0.02),
      fontVariant: TABULAR_NUMS,
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
  });
}

export function GradeBadge({
  v,
  size = 'md',
  accessibilityLabel,
}: GradeBadgeProps): JSX.Element {
  const sz = sizeMap[size];
  const tint = gradeTint(v);
  const styles = useMemo(
    () => makeStyles(tint.bg, tint.fg, sz.w, sz.h, sz.fs),
    [tint.bg, tint.fg, sz.w, sz.h, sz.fs],
  );

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? `Grade ${v}`}
    >
      <Text style={styles.label}>{v}</Text>
    </View>
  );
}
