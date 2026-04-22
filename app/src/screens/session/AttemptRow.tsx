import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { GradeBadge, ResultMark } from '@/components/primitives';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontWeight,
  radius,
  space,
  type Theme,
} from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';
import type { Attempt } from '@/lib/schemas/attempt';

/**
 * 시도 타임라인 1행.
 *
 * 좌측 ResultMark + 우측 GradeBadge·메모·시각 2단 배치.
 * gradeValue 없거나 파싱 실패 시 GradeBadge 는 감춤.
 */
export type AttemptRowProps = {
  attempt: Attempt;
};

const TABULAR_NUMS = Platform.select<Array<'tabular-nums'>>({
  ios: ['tabular-nums'],
  android: [],
  default: [],
}) as Array<'tabular-nums'>;

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function AttemptRow({ attempt }: AttemptRowProps): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const grade = attempt.gradeValue?.trim();

  return (
    <View style={styles.row}>
      <View style={styles.markCell}>
        <ResultMark kind={attempt.result} size={28} />
      </View>
      <View style={styles.body}>
        <View style={styles.topLine}>
          {grade ? <GradeBadge v={grade} size="sm" /> : null}
          <Text style={styles.resultLabel} numberOfLines={1}>
            {t(`attempt.result.${attempt.result}` as const)}
          </Text>
          <Text style={styles.attempts} numberOfLines={1}>
            {`×${attempt.attempts}`}
          </Text>
          <View style={styles.spacer} />
          <Text style={styles.time} numberOfLines={1}>
            {formatTime(attempt.loggedAt)}
          </Text>
        </View>
        {attempt.note ? (
          <Text style={styles.note} numberOfLines={2}>
            {attempt.note}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space[3],
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
    },
    markCell: {
      paddingTop: 2,
    },
    body: {
      flex: 1,
      minWidth: 0,
      gap: space[1],
    },
    topLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
    },
    resultLabel: {
      fontFamily,
      fontSize: 12,
      fontWeight: fontWeight.bold,
      color: theme.text3,
      letterSpacing: 0.4,
    },
    attempts: {
      fontFamily,
      fontSize: 12,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
      fontVariant: TABULAR_NUMS,
    },
    spacer: {
      flex: 1,
    },
    time: {
      fontFamily,
      fontSize: 12,
      fontWeight: fontWeight.medium,
      color: theme.text3,
      fontVariant: TABULAR_NUMS,
    },
    note: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.medium,
      color: theme.text,
      letterSpacing: -0.14,
    },
  });
}
