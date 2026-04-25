import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Chip, PrimaryButton } from '@/components/primitives';
import { useLogAttempt } from '@/hooks/useAttempts';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontWeight,
  radius,
  space,
  type Theme,
} from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';
import {
  ATTEMPT_RESULTS,
  type AttemptResult,
} from '@/lib/schemas/attempt';

/**
 * 시도 기록 인라인 폼.
 *
 * Result 는 Chip 그룹(5종) 로 선택. Grade 와 메모는 TextInput, 시도 횟수는 숫자 키패드.
 * 성공 시 폼 초기화 (쿼리 invalidate 는 훅이 처리).
 */
export type LogAttemptFormProps = {
  accessToken: string;
  sessionExtId: string;
};

export function LogAttemptForm({
  accessToken,
  sessionExtId,
}: LogAttemptFormProps): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const mutation = useLogAttempt(accessToken, sessionExtId);

  const [result, setResult] = useState<AttemptResult>('SEND');
  const [attemptsCount, setAttemptsCount] = useState<string>('1');
  const [grade, setGrade] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const onSubmit = () => {
    const parsed = Number.parseInt(attemptsCount, 10);
    const attempts = Math.max(
      1,
      Math.min(999, Number.isFinite(parsed) ? parsed : 1),
    );
    mutation.mutate(
      {
        result,
        attempts,
        gradeValue: grade.trim() ? grade.trim() : null,
        note: note.trim() ? note.trim() : null,
      },
      {
        onSuccess: () => {
          setGrade('');
          setNote('');
          setAttemptsCount('1');
          setResult('SEND');
        },
      },
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('attempt.log.title')}</Text>

      <View style={styles.section}>
        <Text style={styles.label}>{t('attempt.log.resultLabel')}</Text>
        <View style={styles.chipRow}>
          {ATTEMPT_RESULTS.map((r) => (
            <Chip
              key={r}
              label={t(`attempt.result.${r}` as const)}
              active={r === result}
              onPress={() => setResult(r)}
            />
          ))}
        </View>
      </View>

      <View style={styles.inlineRow}>
        <View style={styles.flex}>
          <Text style={styles.label}>{t('attempt.log.gradeLabel')}</Text>
          <TextInput
            value={grade}
            onChangeText={setGrade}
            maxLength={10}
            placeholder={t('attempt.log.gradePlaceholder')}
            placeholderTextColor={theme.text4}
            style={styles.input}
            accessibilityLabel={t('attempt.log.gradeLabel')}
          />
        </View>
        <View style={styles.attemptsCell}>
          <Text style={styles.label}>{t('attempt.log.attemptsLabel')}</Text>
          <TextInput
            value={attemptsCount}
            onChangeText={setAttemptsCount}
            keyboardType="number-pad"
            style={[styles.input, styles.inputTabular]}
            accessibilityLabel={t('attempt.log.attemptsLabel')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t('attempt.log.noteLabel')}</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          maxLength={300}
          multiline
          placeholder={t('attempt.log.notePlaceholder')}
          placeholderTextColor={theme.text4}
          style={[styles.input, styles.inputMultiline]}
          accessibilityLabel={t('attempt.log.noteLabel')}
        />
      </View>

      {mutation.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t('attempt.log.errorTitle')}</Text>
          <Text style={styles.errorBody}>
            {toUserMessage(mutation.error)}
          </Text>
        </View>
      ) : null}

      {mutation.isPending ? (
        <View style={styles.pendingRow}>
          <ActivityIndicator color={theme.accent.base} />
          <Text style={styles.pendingLabel}>{t('attempt.log.submitting')}</Text>
        </View>
      ) : (
        <PrimaryButton
          onPress={onSubmit}
          accessibilityLabel={t('attempt.log.submit')}
        >
          {t('attempt.log.submit')}
        </PrimaryButton>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.subtle,
      borderRadius: radius.xl,
      padding: space[5],
      gap: space[4],
    },
    cardTitle: {
      fontFamily,
      fontSize: 18,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: -0.36,
    },
    section: {
      gap: space[2],
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space[2],
    },
    label: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
      letterSpacing: -0.13,
    },
    inlineRow: {
      flexDirection: 'row',
      gap: space[3],
    },
    flex: {
      flex: 1,
      gap: space[2],
    },
    attemptsCell: {
      width: 100,
      gap: space[2],
    },
    input: {
      backgroundColor: theme.bg,
      borderRadius: radius.md,
      paddingHorizontal: space[3],
      paddingVertical: space[3],
      color: theme.text,
      fontFamily,
      fontSize: 15,
      fontWeight: fontWeight.medium,
    },
    inputTabular: {
      textAlign: 'center',
    },
    inputMultiline: {
      minHeight: 80,
      textAlignVertical: 'top',
      paddingTop: space[3],
    },
    errorBox: {
      backgroundColor: `${theme.semantic.danger}14`,
      borderRadius: radius.md,
      padding: space[3],
      gap: space[1],
    },
    errorTitle: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
    },
    errorBody: {
      fontFamily,
      fontSize: 13,
      color: theme.text2,
    },
    pendingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      justifyContent: 'center',
      paddingVertical: space[3],
    },
    pendingLabel: {
      fontFamily,
      fontSize: 14,
      color: theme.text3,
      fontWeight: fontWeight.semibold,
    },
  });
}
