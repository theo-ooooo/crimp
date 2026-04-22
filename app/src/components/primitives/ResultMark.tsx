import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fontFamily, type Theme } from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';

export type ResultKind = 'SEND' | 'FLASH' | 'ONSIGHT' | 'TRY' | 'FAIL';

export type ResultMarkProps = {
  kind: ResultKind;
  size?: number;
  accessibilityLabel?: string;
};

/**
 * react-native-svg 미설치 환경 폴백.
 * - 원형 View + 유니코드 글리프로 SVG 경로를 대체한다.
 * - 단색 의존을 피하기 위해 kind 별로 서로 다른 글리프를 쓴다.
 */
const glyphMap: Record<ResultKind, string> = {
  SEND: '\u2713', // check mark
  FLASH: '\u26A1', // high voltage / lightning
  ONSIGHT: '\u25C9', // fisheye (target)
  TRY: '\u23F1', // stopwatch
  FAIL: '\u2715', // multiplication X
};

function resolveColors(kind: ResultKind, theme: Theme): { bg: string; fg: string } {
  switch (kind) {
    case 'SEND':
      return { bg: theme.accent.base, fg: theme.accent.on };
    case 'FLASH':
      return { bg: theme.semantic.warning, fg: '#1A1200' };
    case 'ONSIGHT':
      return { bg: theme.semantic.success, fg: theme.accent.on };
    case 'TRY':
      return { bg: theme.subtle2, fg: theme.text2 };
    case 'FAIL':
      return { bg: theme.subtle2, fg: theme.text3 };
  }
}

function makeStyles(size: number, bg: string, fg: string) {
  return StyleSheet.create({
    container: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    glyph: {
      color: fg,
      fontFamily,
      fontSize: size * 0.56,
      fontWeight: '700',
      lineHeight: size,
      textAlign: 'center',
      includeFontPadding: false,
    },
  });
}

export function ResultMark({
  kind,
  size = 22,
  accessibilityLabel,
}: ResultMarkProps): JSX.Element {
  const theme = useTokens();
  const { bg, fg } = resolveColors(kind, theme);
  const styles = useMemo(() => makeStyles(size, bg, fg), [size, bg, fg]);

  return (
    <View
      style={styles.container}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? kind}
    >
      <Text style={styles.glyph} allowFontScaling={false}>
        {glyphMap[kind]}
      </Text>
    </View>
  );
}
