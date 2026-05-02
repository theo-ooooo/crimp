import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  CrimpModal,
  PrimaryButton,
  SecondaryButton,
} from '@/components/common/primitives';
import { useUpdateProfile } from '@/hooks/queries/useUpdateProfile';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
  type Theme,
} from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';

const NICKNAME_MIN = 2;
const NICKNAME_MAX = 30;

export function NicknamePromptModal({
  accessToken,
  initialNickname,
  visible,
  onDismiss,
}: {
  accessToken: string | null;
  initialNickname: string;
  visible: boolean;
  onDismiss: () => void;
}): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const updateMutation = useUpdateProfile(accessToken);
  const [nickname, setNickname] = useState(initialNickname);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setNickname(initialNickname);
    setErrorMessage(null);
  }, [initialNickname]);

  const trimmed = nickname.trim();
  const validation = useMemo(() => {
    if (trimmed.length < NICKNAME_MIN || trimmed.length > NICKNAME_MAX) {
      return t('profile.nicknamePrompt.nicknameHelp');
    }
    return null;
  }, [trimmed]);

  const handleChangeText = (value: string) => {
    setNickname(value);
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleSubmit = () => {
    if (validation || updateMutation.isPending) {
      return;
    }
    updateMutation.mutate(
      { nickname: trimmed },
      {
        onSuccess: onDismiss,
        onError: (err) => setErrorMessage(toUserMessage(err)),
      },
    );
  };

  return (
    <CrimpModal
      visible={visible}
      onRequestClose={onDismiss}
      dismissOnBackdrop={false}
      testID="nickname-prompt-modal"
    >
      <View style={styles.content} accessibilityLiveRegion="polite">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t('profile.nicknamePrompt.eyebrow')}</Text>
          <Text style={styles.title}>{t('profile.nicknamePrompt.title')}</Text>
          <Text style={styles.body}>{t('profile.nicknamePrompt.body')}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('profile.nickname')}</Text>
          <TextInput
            value={nickname}
            onChangeText={handleChangeText}
            editable={!updateMutation.isPending}
            maxLength={NICKNAME_MAX}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="nickname"
            placeholder={t('profile.edit.nicknamePlaceholder')}
            placeholderTextColor={theme.text4}
            style={styles.input}
            accessibilityLabel={t('profile.nickname')}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          <Text style={styles.help}>{t('profile.nicknamePrompt.nicknameHelp')}</Text>
        </View>

        {validation || errorMessage ? (
          <Text style={styles.error} accessibilityRole="alert">
            {errorMessage ?? validation}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <View style={styles.actionWrapper}>
            <SecondaryButton
              onPress={onDismiss}
              disabled={updateMutation.isPending}
            >
              {t('profile.nicknamePrompt.laterCta')}
            </SecondaryButton>
          </View>
          <View style={styles.actionWrapper}>
            <PrimaryButton
              onPress={handleSubmit}
              disabled={updateMutation.isPending || Boolean(validation)}
            >
              {updateMutation.isPending
                ? t('profile.edit.saving')
                : t('profile.nicknamePrompt.saveCta')}
            </PrimaryButton>
          </View>
        </View>

        {updateMutation.isPending ? (
          <ActivityIndicator color={theme.accent.base} style={styles.spinner} />
        ) : null}
      </View>
    </CrimpModal>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    content: {
      gap: space[5],
    },
    header: {
      gap: space[2],
    },
    eyebrow: {
      color: theme.text3,
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.caption,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.text,
      fontFamily,
      fontSize: fontSize.h2,
      fontWeight: fontWeight.extrabold,
      letterSpacing: letterSpacing.h2,
    },
    body: {
      color: theme.text2,
      fontFamily,
      fontSize: fontSize.body,
      lineHeight: 22,
    },
    field: {
      gap: space[2],
    },
    label: {
      color: theme.text2,
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
    },
    input: {
      minHeight: 52,
      borderRadius: radius.lg,
      backgroundColor: theme.subtle2,
      color: theme.text,
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      paddingHorizontal: space[4],
    },
    help: {
      color: theme.text3,
      fontFamily,
      fontSize: fontSize.caption,
      lineHeight: 18,
    },
    error: {
      color: theme.semantic.danger,
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      lineHeight: 22,
    },
    actions: {
      flexDirection: 'row',
      gap: space[3],
    },
    actionWrapper: {
      flex: 1,
    },
    spinner: {
      alignSelf: 'center',
    },
  });
}
