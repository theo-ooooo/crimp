import { useRoute, type RouteProp } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAttemptsQuery, useLogAttempt } from '@/hooks/useAttempts';
import { useEndSession, useSessionQuery } from '@/hooks/useSessions';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import type { RootStackParamList } from '@/navigation/types';
import {
  ATTEMPT_RESULTS,
  type Attempt,
  type AttemptResult,
} from '@/lib/schemas/attempt';
import type { Session } from '@/lib/schemas/session';
import { useTokenStore } from '@/store/tokenStore';

/**
 * 세션 상세 화면 (앱).
 *
 * - 세션 정보 + 시도 목록 + 시도 기록 inline 폼
 * - 세션 종료 버튼은 아직 진행 중일 때만 표시
 */
export default function SessionDetailScreen(): JSX.Element {
  const route = useRoute<RouteProp<RootStackParamList, 'SessionDetail'>>();
  const { extId } = route.params;
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);

  const sessionQuery = useSessionQuery(accessToken, extId);
  const attemptsQuery = useAttemptsQuery(accessToken, extId);
  const endSession = useEndSession(accessToken);

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!accessToken) {
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>
          {t('session.detail.loginRequiredTitle')}
        </Text>
        <Text style={styles.muted}>
          {t('session.detail.loginRequiredDescription')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {sessionQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#ff7a1f" />
        </View>
      ) : sessionQuery.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>
            {t('session.detail.errorTitle')}
          </Text>
          <Text style={styles.muted}>
            {toUserMessage(sessionQuery.error)}
          </Text>
        </View>
      ) : sessionQuery.data ? (
        <SessionCard
          session={sessionQuery.data}
          ending={endSession.isPending}
          onEnd={() => {
            endSession.endSession(sessionQuery.data!.extId).catch(() => {
              /* 에러는 endSession.error 에 반영 */
            });
          }}
          endError={endSession.error}
        />
      ) : null}

      <Text style={styles.sectionTitle}>
        {t('session.detail.attemptsTitle')}
      </Text>

      {attemptsQuery.isLoading ? (
        <ActivityIndicator color="#ff7a1f" />
      ) : attemptsQuery.error ? (
        <Text style={styles.errorTitle}>
          {toUserMessage(attemptsQuery.error)}
        </Text>
      ) : attemptsQuery.data && attemptsQuery.data.items.length > 0 ? (
        attemptsQuery.data.items.map((a) => (
          <AttemptRow key={a.extId} attempt={a} />
        ))
      ) : (
        <Text style={styles.muted}>{t('session.detail.attemptsEmpty')}</Text>
      )}

      {sessionQuery.data && !sessionQuery.data.endedAt ? (
        <LogAttemptForm accessToken={accessToken} sessionExtId={extId} />
      ) : null}
    </ScrollView>
  );
}

function SessionCard({
  session,
  ending,
  onEnd,
  endError,
}: {
  session: Session;
  ending: boolean;
  onEnd: () => void;
  endError: Error | null;
}): JSX.Element {
  const ended = Boolean(session.endedAt);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>
          {session.gymNameRaw ?? t('session.list.itemGymFallback')}
        </Text>
        <Text style={ended ? styles.badgeMuted : styles.badgeAccent}>
          {ended
            ? t('session.detail.endedBadge')
            : t('session.detail.ongoingBadge')}
        </Text>
      </View>

      <KeyValue
        label={t('session.detail.labelStartedAt')}
        value={formatDateTime(session.startedAt)}
      />
      <KeyValue
        label={t('session.detail.labelEndedAt')}
        value={session.endedAt ? formatDateTime(session.endedAt) : t('common.empty')}
      />
      <KeyValue
        label={t('session.detail.labelDuration')}
        value={
          session.durationMin === null
            ? t('common.empty')
            : t('session.list.itemDurationMinutes').replace(
                '{{minutes}}',
                String(Math.max(0, session.durationMin)),
              )
        }
      />
      <KeyValue
        label={t('session.detail.labelNote')}
        value={session.note ?? t('common.empty')}
      />
      <KeyValue
        label={t('session.detail.labelCondition')}
        value={session.condition === null ? t('common.empty') : String(session.condition)}
      />

      {!ended ? (
        <>
          <Pressable
            accessibilityRole="button"
            onPress={onEnd}
            disabled={ending}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.secondaryButtonPressed : null,
              ending ? styles.secondaryButtonDisabled : null,
            ]}
          >
            <Text style={styles.secondaryButtonLabel}>
              {ending
                ? t('session.detail.ending')
                : t('session.detail.endButton')}
            </Text>
          </Pressable>
          {endError ? (
            <Text style={styles.errorTitle}>{toUserMessage(endError)}</Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function AttemptRow({ attempt }: { attempt: Attempt }): JSX.Element {
  return (
    <View style={styles.attemptRow}>
      <View style={styles.itemRow}>
        <Text style={styles.cardTitle}>
          {t(`attempt.result.${attempt.result}` as const)}
        </Text>
        <Text style={styles.itemMeta}>{formatDateTime(attempt.loggedAt)}</Text>
      </View>
      <View style={styles.itemRow}>
        <Text style={styles.itemMeta}>
          {attempt.gradeValue ?? t('common.empty')}
        </Text>
        <Text style={styles.itemMeta}>×{attempt.attempts}</Text>
      </View>
      {attempt.note ? (
        <Text style={styles.noteText}>{attempt.note}</Text>
      ) : null}
    </View>
  );
}

function LogAttemptForm({
  accessToken: _accessToken,
  sessionExtId,
}: {
  accessToken: string;
  sessionExtId: string;
}): JSX.Element {
  const [result, setResult] = useState<AttemptResult>('SEND');
  const [attemptsCount, setAttemptsCount] = useState<string>('1');
  const [grade, setGrade] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const mutation = useLogAttempt(_accessToken, sessionExtId);

  const onSubmit = () => {
    const parsed = Number.parseInt(attemptsCount, 10);
    const attempts = Math.max(1, Math.min(999, Number.isFinite(parsed) ? parsed : 1));
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

      <Text style={styles.label}>{t('attempt.log.resultLabel')}</Text>
      <View style={styles.pillRow}>
        {ATTEMPT_RESULTS.map((r) => (
          <Pressable
            key={r}
            onPress={() => setResult(r)}
            style={({ pressed }) => [
              styles.pill,
              r === result ? styles.pillActive : null,
              pressed ? styles.pillPressed : null,
            ]}
          >
            <Text
              style={r === result ? styles.pillLabelActive : styles.pillLabel}
            >
              {t(`attempt.result.${r}` as const)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t('attempt.log.attemptsLabel')}</Text>
      <TextInput
        value={attemptsCount}
        onChangeText={setAttemptsCount}
        keyboardType="number-pad"
        style={[styles.input, styles.inputSmall]}
        accessibilityLabel={t('attempt.log.attemptsLabel')}
      />

      <Text style={styles.label}>{t('attempt.log.gradeLabel')}</Text>
      <TextInput
        value={grade}
        onChangeText={setGrade}
        maxLength={10}
        placeholder={t('attempt.log.gradePlaceholder')}
        placeholderTextColor="#525252"
        style={styles.input}
        accessibilityLabel={t('attempt.log.gradeLabel')}
      />

      <Text style={styles.label}>{t('attempt.log.noteLabel')}</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        maxLength={300}
        multiline
        placeholder={t('attempt.log.notePlaceholder')}
        placeholderTextColor="#525252"
        style={[styles.input, styles.inputMultiline]}
        accessibilityLabel={t('attempt.log.noteLabel')}
      />

      {mutation.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>
            {t('attempt.log.errorTitle')}
          </Text>
          <Text style={styles.muted}>{toUserMessage(mutation.error)}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={onSubmit}
        disabled={mutation.isPending}
        style={({ pressed }) => [
          styles.submit,
          pressed ? styles.submitPressed : null,
          mutation.isPending ? styles.submitDisabled : null,
        ]}
      >
        {mutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitLabel}>{t('attempt.log.submit')}</Text>
        )}
      </Pressable>
    </View>
  );
}

function KeyValue({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value}</Text>
    </View>
  );
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0b',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  heading: { color: '#f5f5f4', fontSize: 18, fontWeight: '600' },
  muted: { color: '#a3a3a3', fontSize: 13 },
  sectionTitle: {
    color: '#f5f5f4',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  card: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#111111',
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: { color: '#f5f5f4', fontSize: 14, fontWeight: '500' },
  badgeMuted: {
    color: '#737373',
    fontSize: 11,
    backgroundColor: '#262626',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeAccent: {
    color: '#ff7a1f',
    fontSize: 11,
    backgroundColor: '#1f1208',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  kvLabel: {
    color: '#737373',
    fontSize: 11,
    width: 60,
  },
  kvValue: {
    color: '#d4d4d4',
    fontSize: 12,
    flexShrink: 1,
    fontFamily: 'Menlo',
  },
  attemptRow: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#0f0f0f',
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemMeta: { color: '#a3a3a3', fontSize: 12 },
  noteText: { color: '#d4d4d4', fontSize: 12, marginTop: 4 },
  label: { color: '#a3a3a3', fontSize: 12, marginTop: 4 },
  input: {
    color: '#f5f5f4',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#0b0b0b',
  },
  inputSmall: { width: 80 },
  inputMultiline: { minHeight: 60, textAlignVertical: 'top' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#404040',
  },
  pillActive: {
    borderColor: '#ff7a1f',
    backgroundColor: '#1f1208',
  },
  pillPressed: { opacity: 0.75 },
  pillLabel: { color: '#d4d4d4', fontSize: 12 },
  pillLabelActive: { color: '#ff7a1f', fontSize: 12, fontWeight: '600' },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#404040',
    marginTop: 4,
  },
  secondaryButtonPressed: { backgroundColor: '#1f1f1f' },
  secondaryButtonDisabled: { opacity: 0.5 },
  secondaryButtonLabel: { color: '#e5e5e5', fontSize: 12 },
  errorBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7f1d1d',
    backgroundColor: '#1a0a0a',
    gap: 4,
  },
  errorTitle: { color: '#f87171', fontSize: 12 },
  submit: {
    marginTop: 6,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#ff7a1f',
  },
  submitPressed: { opacity: 0.85 },
  submitDisabled: { opacity: 0.5 },
  submitLabel: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
});
