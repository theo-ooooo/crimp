import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { fontFamily, type Theme } from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';

/**
 * RN `fontVariant: ['tabular-nums']` 는 iOS 전용이며 Android 에서는 무시된다.
 * 숫자 폭이 정확히 일치할 필요가 있는 시계·타이머·큰 통계 값은 iOS 에서만 고정폭 숫자로
 * 렌더링되고, Android 는 시스템 기본 비례폭 숫자로 표시된다 (시각 차이 극히 미미).
 * Android 에서 고정폭이 꼭 필요해지면 Roboto Mono 또는 Pretendard 번들 + 전용 Text 로 대체.
 */
const TABULAR_NUMS = Platform.select<Array<'tabular-nums'>>({
  ios: ['tabular-nums'],
  android: [],
  default: [],
}) as Array<'tabular-nums'>;

export type BigStatScale = 'sm' | 'md' | 'lg' | 'xl' | 'hero';
export type BigStatAlign = 'left' | 'center';

export type BigStatProps = {
  value: string | number;
  label: string;
  unit?: string;
  scale?: BigStatScale;
  align?: BigStatAlign;
  accent?: string;
};

const scales: Record<BigStatScale, { num: number; lbl: number }> = {
  sm: { num: 32, lbl: 13 },
  md: { num: 48, lbl: 13 },
  lg: { num: 72, lbl: 14 },
  xl: { num: 96, lbl: 15 },
  hero: { num: 140, lbl: 16 },
};

function makeStyles(
  theme: Theme,
  num: number,
  lbl: number,
  align: BigStatAlign,
  accent: string | undefined,
) {
  const textAlign = align === 'center' ? 'center' : 'left';
  return StyleSheet.create({
    wrapper: {
      alignItems: align === 'center' ? 'center' : 'flex-start',
    },
    label: {
      fontFamily,
      fontSize: lbl,
      fontWeight: '600',
      color: theme.text3,
      letterSpacing: -(lbl * 0.01),
      marginBottom: 6,
      textAlign,
    },
    numberRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: align === 'center' ? 'center' : 'flex-start',
    },
    number: {
      fontFamily,
      fontSize: num,
      fontWeight: '800',
      color: accent ?? theme.text,
      letterSpacing: -(num * 0.05),
      lineHeight: num * 0.95,
      fontVariant: TABULAR_NUMS,
      includeFontPadding: false,
    },
    unit: {
      fontFamily,
      fontSize: num * 0.4,
      fontWeight: '700',
      color: theme.text3,
      marginLeft: 4,
      letterSpacing: -(num * 0.02),
      includeFontPadding: false,
    },
  });
}

export function BigStat({
  value,
  label,
  unit,
  scale = 'md',
  align = 'left',
  accent,
}: BigStatProps): JSX.Element {
  const theme = useTokens();
  const { num, lbl } = scales[scale];
  const styles = useMemo(
    () => makeStyles(theme, num, lbl, align, accent),
    [theme, num, lbl, align, accent],
  );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.numberRow}>
        <Text style={styles.number}>{String(value)}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}
