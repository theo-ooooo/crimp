import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useStartSession } from '@/hooks/useSessions';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import type { RootStackNavigationProp } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

/**
 * 세션 시작 화면 (앱).
 *
 * DatePicker 라이브러리를 추가하지 않기 위해 MVP 에서는 "지금 시작" 만 허용.
 * 세션 시간 커스터마이즈는 후속 이슈에서 date/time picker 도입 후 노출.
 */
export default function StartSessionScreen(): JSX.Element {
  const navigation = useNavigation<RootStackNavigationProp<'StartSession'>>();
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);
  const mutation = useStartSession(accessToken);

  const [gymName, setGymName] = useState<string>('');

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
        <Text style={styles.heading}>{t('session.detail.loginRequiredTitle')}</Text>
        <Text style={styles.muted}>{t('session.detail.loginRequiredDescription')}</Text>
      </View>
    );
  }

  const onSubmit = () => {
    mutation.mutate(
      {
        gymNameRaw: gymName.trim() ? gymName.trim() : null,
        startedAt: new Date().toISOString(),
      },
      {
        onSuccess: (created) => {
          navigation.replace('SessionDetail', { extId: created.extId });
        },
      },
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('session.start.title')}</Text>

      <View style={styles.field}>
        <Text style={styles.label}>{t('session.start.gymNameLabel')}</Text>
        <TextInput
          value={gymName}
          onChangeText={setGymName}
          maxLength={100}
          placeholder={t('session.start.gymNamePlaceholder')}
          placeholderTextColor="#525252"
          style={styles.input}
          autoCapitalize="none"
          accessibilityLabel={t('session.start.gymNameLabel')}
        />
      </View>

      <Text style={styles.hint}>
        {t('session.start.startedAtLabel')}: {new Date().toLocaleString()}
      </Text>

      {mutation.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>
            {t('session.start.errorTitle')}
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
          <Text style={styles.submitLabel}>{t('session.start.submit')}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0b',
    padding: 20,
    gap: 16,
  },
  title: {
    color: '#f5f5f4',
    fontSize: 20,
    fontWeight: '600',
  },
  heading: {
    color: '#f5f5f4',
    fontSize: 18,
    fontWeight: '600',
  },
  muted: {
    color: '#a3a3a3',
    fontSize: 13,
  },
  hint: {
    color: '#737373',
    fontSize: 12,
  },
  field: { gap: 6 },
  label: { color: '#a3a3a3', fontSize: 12 },
  input: {
    color: '#f5f5f4',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#111111',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7f1d1d',
    backgroundColor: '#1a0a0a',
    gap: 4,
  },
  errorTitle: { color: '#f87171', fontSize: 13 },
  submit: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#ff7a1f',
  },
  submitPressed: { opacity: 0.85 },
  submitDisabled: { opacity: 0.5 },
  submitLabel: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
});
