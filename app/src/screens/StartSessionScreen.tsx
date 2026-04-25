import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/primitives';
import { useStartSession } from '@/hooks/useSessions';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontWeight,
  letterSpacing,
  radius,
  space,
  type Theme,
} from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';
import type { RootStackNavigationProp, RootStackParamList } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

/**
 * 세션 시작 화면.
 *
 * - 최상단 H2 "어디서 붙어요?" 질문
 * - 암장 TextInput (theme.subtle + radius 16 + padding 16)
 * - 하단 고정 PrimaryButton + KeyboardAvoidingView
 * - 에러 블록: danger 톤 카드
 */
export default function StartSessionScreen(): JSX.Element {
  const theme = useTokens();
  const navigation = useNavigation<RootStackNavigationProp<'StartSession'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'StartSession'>>();
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);
  const mutation = useStartSession(accessToken);

  // 암장 상세에서 "이 암장에서 세션 시작" 으로 넘어오면 route.params 로 전달된다.
  const selectedGymExtId = route.params?.gymExtId ?? null;
  const selectedGymName = route.params?.gymName ?? null;
  const hasSelectedGym = Boolean(selectedGymExtId);

  const [gymName, setGymName] = useState<string>(selectedGymName ?? '');
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // params 로 전달된 gymName 이 바뀌면 입력값 동기화.
  useEffect(() => {
    if (selectedGymName) {
      setGymName(selectedGymName);
    }
  }, [selectedGymName]);

  const clearSelectedGym = () => {
    // 선택된 암장을 해제 → params 를 지우고 free-form 입력으로 전환.
    navigation.setParams({ gymExtId: undefined, gymName: undefined });
  };

  if (!hydrated) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={styles.muted}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!accessToken) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={styles.heading}>
          {t('session.detail.loginRequiredTitle')}
        </Text>
        <Text style={styles.muted}>
          {t('session.detail.loginRequiredDescription')}
        </Text>
      </View>
    );
  }

  const onSubmit = () => {
    mutation.mutate(
      {
        gymExtId: selectedGymExtId ?? null,
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
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.bg }]}
      behavior={Platform.select({ ios: 'padding', android: 'height' })}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{t('session.start.eyebrow')}</Text>
          <Text style={styles.title}>{t('session.start.question')}</Text>
          <Text style={styles.subtitle}>{t('session.start.subtitle')}</Text>
        </View>

        {hasSelectedGym && selectedGymName ? (
          <View
            style={styles.selectedGymCard}
            accessible
            accessibilityRole="summary"
            accessibilityLabel={t('session.start.selectedGymLabel')}
          >
            <View style={styles.selectedGymText}>
              <Text style={styles.selectedGymLabel}>
                {t('session.start.selectedGymLabel')}
              </Text>
              <Text style={styles.selectedGymName} numberOfLines={1}>
                {selectedGymName}
              </Text>
            </View>
            <Pressable
              onPress={clearSelectedGym}
              accessibilityRole="button"
              accessibilityLabel={t('session.start.clearGymCta')}
              style={({ pressed }) => [
                styles.clearButton,
                pressed && styles.clearButtonPressed,
              ]}
              hitSlop={8}
            >
              <Text style={styles.clearButtonLabel}>
                {t('session.start.clearGymCta')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.field}>
            <Text style={styles.label}>{t('session.start.gymNameLabel')}</Text>
            <TextInput
              value={gymName}
              onChangeText={setGymName}
              maxLength={100}
              placeholder={t('session.start.gymNamePlaceholder')}
              placeholderTextColor={theme.text4}
              style={styles.input}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={onSubmit}
              accessibilityLabel={t('session.start.gymNameLabel')}
            />
          </View>
        )}

        <Text style={styles.hint}>
          {t('session.start.startedAtLabel')} · {formatNow()}
        </Text>

        {mutation.error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>
              {t('session.start.errorTitle')}
            </Text>
            <Text style={styles.errorBody}>
              {toUserMessage(mutation.error)}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bottomBar}>
        {mutation.isPending ? (
          <View style={styles.pendingRow}>
            <ActivityIndicator color={theme.accent.base} />
            <Text style={styles.pendingLabel}>
              {t('session.start.submitting')}
            </Text>
          </View>
        ) : (
          <PrimaryButton
            onPress={onSubmit}
            accessibilityLabel={t('session.start.submit')}
          >
            {t('session.start.submit')}
          </PrimaryButton>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function formatNow(): string {
  try {
    const d = new Date();
    return d.toLocaleString();
  } catch {
    return '';
  }
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: space[5],
      paddingBottom: space[10],
      gap: space[5],
    },
    hero: {
      gap: space[2],
      marginTop: space[3],
    },
    eyebrow: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.accent.base,
      letterSpacing: 0.26,
    },
    title: {
      fontFamily,
      // TODO F1: fontSize.* 서브스케일 (28 = h2Tight 등) 추가되면 교체
      fontSize: 28,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: letterSpacing.h2,
      lineHeight: 32,
    },
    subtitle: {
      fontFamily,
      fontSize: 15,
      fontWeight: fontWeight.medium,
      color: theme.text3,
      letterSpacing: -0.15,
    },
    field: {
      gap: space[2],
    },
    label: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
      letterSpacing: -0.13,
    },
    input: {
      backgroundColor: theme.subtle,
      borderRadius: radius.lg,
      paddingHorizontal: space[4],
      paddingVertical: space[4],
      fontFamily,
      // TODO F1: fontSize.* 서브스케일 (17 = bodyLg 등) 추가되면 교체
      fontSize: 17,
      fontWeight: fontWeight.medium,
      color: theme.text,
      letterSpacing: -0.34,
    },
    hint: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.medium,
      color: theme.text3,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space[6],
      gap: space[2],
    },
    heading: {
      fontFamily,
      fontSize: 18,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    muted: {
      fontFamily,
      fontSize: 14,
      color: theme.text3,
    },
    errorBox: {
      backgroundColor: `${theme.semantic.danger}14`,
      borderRadius: radius.lg,
      padding: space[4],
      gap: space[1],
    },
    errorTitle: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
    },
    errorBody: {
      fontFamily,
      fontSize: 13,
      color: theme.text2,
    },
    bottomBar: {
      paddingHorizontal: space[5],
      paddingTop: space[3],
      paddingBottom: space[5],
      backgroundColor: theme.bg,
    },
    pendingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[2],
      height: 56,
    },
    pendingLabel: {
      fontFamily,
      fontSize: 15,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    selectedGymCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      backgroundColor: theme.subtle,
      borderRadius: radius.lg,
      paddingHorizontal: space[4],
      paddingVertical: space[4],
    },
    selectedGymText: {
      flex: 1,
      gap: space[1],
    },
    selectedGymLabel: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
      letterSpacing: -0.13,
    },
    selectedGymName: {
      fontFamily,
      fontSize: 17,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: -0.34,
    },
    clearButton: {
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      borderRadius: radius.full,
      backgroundColor: theme.bg,
    },
    clearButtonPressed: {
      opacity: 0.7,
    },
    clearButtonLabel: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.text2,
    },
  });
}
