import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fontFamily, type Theme } from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';

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
      fontVariant: ['tabular-nums'],
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
