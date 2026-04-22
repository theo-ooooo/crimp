import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Theme } from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';

export type HoldColorKey = keyof Theme['hold'];

export type HoldDotProps = {
  color: HoldColorKey | string;
  size?: number;
  accessibilityLabel?: string;
};

function resolveColor(value: HoldColorKey | string, theme: Theme): string {
  // 프로토타입 체인 오염 방지: 자체 프로퍼티만 허용.
  if (Object.prototype.hasOwnProperty.call(theme.hold, value)) {
    return theme.hold[value as HoldColorKey];
  }
  return value;
}

function makeStyles(size: number, bg: string, hairline: string, isWhite: boolean) {
  return StyleSheet.create({
    dot: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: bg,
      borderWidth: isWhite ? StyleSheet.hairlineWidth : 0,
      borderColor: isWhite ? hairline : 'transparent',
    },
  });
}

export function HoldDot({
  color,
  size = 14,
  accessibilityLabel,
}: HoldDotProps): JSX.Element {
  const theme = useTokens();
  const bg = resolveColor(color, theme);
  const isWhite = color === 'white';
  const styles = useMemo(
    () => makeStyles(size, bg, theme.hairline, isWhite),
    [size, bg, theme.hairline, isWhite],
  );

  return (
    <View
      style={styles.dot}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? `hold ${color}`}
    />
  );
}
