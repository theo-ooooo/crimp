import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { PrimaryButton, SecondaryButton } from '@/components/common/primitives';
import { ProfileAvatarEditSection } from '@/components/profile/ProfileAvatarEditSection';
import { useMeQuery } from '@/hooks/queries/useMe';
import { useUpdateProfile } from '@/hooks/queries/useUpdateProfile';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import type { UpdateProfileBody } from '@/lib/schemas/me';
import {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
  touchTarget,
  withAlpha,
  type Theme,
} from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';
import type { RootStackNavigationProp } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

const BIO_MAX = 300;
const NICKNAME_MIN = 2;
const NICKNAME_MAX = 30;
const LEVEL_MIN = 0;
const LEVEL_MAX = 12;

export default function ProfileEditScreen(): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const accessToken = useTokenStore((s) => s.accessToken);
  const navigation = useNavigation<RootStackNavigationProp<'ProfileEdit'>>();
  const meQuery = useMeQuery(accessToken);
  const updateMutation = useUpdateProfile(accessToken);

  const me = meQuery.data ?? null;
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [levelSelf, setLevelSelf] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!me) {
      return;
    }
    setNickname(me.nickname ?? '');
    setBio(me.bio ?? '');
    setLevelSelf(clampLevel(me.levelSelf ?? 0));
  }, [me]);

  useEffect(() => {
    if (!updateMutation.error) {
      return;
    }
    setToastMessage(toUserMessage(updateMutation.error));
  }, [updateMutation.error]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const originalNickname = me?.nickname ?? '';
  const originalBio = me?.bio ?? '';
  const originalLevel = clampLevel(me?.levelSelf ?? 0);

  const validation = useMemo(() => {
    const trimmedNickname = nickname.trim();
    const trimmedBio = bio.trim();
    if (
      trimmedNickname.length < NICKNAME_MIN ||
      trimmedNickname.length > NICKNAME_MAX
    ) {
      return t('profile.edit.nicknameHelp');
    }
    if (trimmedBio.length > BIO_MAX) {
      return t('profile.edit.bioHelp');
    }
    return null;
  }, [bio, nickname]);

  const isDirty =
    nickname.trim() !== originalNickname ||
    bio.trim() !== originalBio ||
    levelSelf !== originalLevel;

  const onSubmit = () => {
    if (!me || validation || !isDirty) {
      return;
    }

    const body: UpdateProfileBody = {};
    if (nickname.trim() !== originalNickname) {
      body.nickname = nickname.trim();
    }
    if (bio.trim() !== originalBio) {
      body.bio = bio.trim();
    }
    if (levelSelf !== originalLevel) {
      body.levelSelf = levelSelf;
    }

    updateMutation.mutate(body, {
      onSuccess: () => navigation.goBack(),
    });
  };

  const updateAvatar = async (avatarMediaId: number) => {
    await updateMutation.mutateAsync({ avatarMediaId });
    setToastMessage(t('profile.edit.avatarSaved'));
  };

  const clearAvatar = async () => {
    await updateMutation.mutateAsync({ clearAvatar: true });
    setToastMessage(t('profile.edit.avatarCleared'));
  };

  if (meQuery.error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t('profile.loadErrorTitle')}</Text>
          <Text style={styles.muted}>{toUserMessage(meQuery.error)}</Text>
        </View>
      </View>
    );
  }

  if (meQuery.isLoading || !me) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent.base} />
        <Text style={styles.muted}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{t('profile.title')}</Text>
        <Text style={styles.title}>{t('profile.edit.title')}</Text>
      </View>

      <ProfileAvatarEditSection
        accessToken={accessToken ?? ''}
        avatarUrl={me.avatarUrl}
        nickname={nickname || me.nickname || t('home.nicknameFallback')}
        disabled={updateMutation.isPending || !accessToken}
        onAvatarUploaded={updateAvatar}
        onAvatarCleared={clearAvatar}
        onError={(err) => setToastMessage(toUserMessage(err))}
      />

      <Field
        label={t('profile.nickname')}
        help={t('profile.edit.nicknameHelp')}
        styles={styles}
      >
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          editable={!updateMutation.isPending}
          maxLength={NICKNAME_MAX}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="nickname"
          placeholder={t('profile.edit.nicknamePlaceholder')}
          placeholderTextColor={theme.text4}
          style={styles.input}
        />
      </Field>

      <Field
        label={t('profile.edit.bioLabel')}
        help={t('profile.edit.bioHelp')}
        styles={styles}
      >
        <TextInput
          value={bio}
          onChangeText={setBio}
          editable={!updateMutation.isPending}
          maxLength={BIO_MAX}
          multiline
          textAlignVertical="top"
          placeholder={t('profile.edit.bioPlaceholder')}
          placeholderTextColor={theme.text4}
          style={[styles.input, styles.textArea]}
        />
        <Text style={styles.counter}>
          {bio.trim().length}/{BIO_MAX}
        </Text>
      </Field>

      <Field
        label={t('profile.edit.levelLabel')}
        help={t('profile.edit.levelHelp')}
        styles={styles}
      >
        <LevelSlider
          value={levelSelf}
          disabled={updateMutation.isPending}
          onChange={setLevelSelf}
          styles={styles}
        />
      </Field>

      {validation ? (
        <View style={styles.inlineErrorBox}>
          <Text style={styles.inlineErrorTitle}>{validation}</Text>
        </View>
      ) : null}

      <View style={styles.buttonRow}>
        <View style={styles.buttonFlex}>
          <SecondaryButton
            onPress={() => navigation.goBack()}
            disabled={updateMutation.isPending}
          >
            {t('common.cancel')}
          </SecondaryButton>
        </View>
        <View style={styles.buttonFlex}>
          <PrimaryButton
            onPress={onSubmit}
            disabled={updateMutation.isPending || !isDirty || Boolean(validation)}
          >
            {updateMutation.isPending ? t('profile.edit.saving') : t('common.save')}
          </PrimaryButton>
        </View>
      </View>
      </ScrollView>
      {toastMessage ? <Toast message={toastMessage} styles={styles} /> : null}
    </View>
  );
}

function Field({
  label,
  help,
  styles,
  children,
}: {
  label: string;
  help: string;
  styles: ReturnType<typeof makeStyles>;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      <Text style={styles.help}>{help}</Text>
    </View>
  );
}

function LevelSlider({
  value,
  disabled,
  onChange,
  styles,
}: {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
  styles: ReturnType<typeof makeStyles>;
}): JSX.Element {
  const values = Array.from({ length: LEVEL_MAX - LEVEL_MIN + 1 }, (_, i) => i);
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeader}>
        <Text style={styles.levelValue}>V{value}</Text>
      </View>
      <View style={styles.sliderTrack}>
        {values.map((v) => {
          const active = v <= value;
          const selected = v === value;
          return (
            <Pressable
              key={v}
              onPress={() => onChange(v)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ disabled, selected }}
              accessibilityLabel={`V${v}`}
              hitSlop={8}
              style={styles.tickButton}
            >
              <View
                style={[
                  styles.tick,
                  active ? styles.tickActive : null,
                  selected ? styles.tickSelected : null,
                ]}
              />
              {v % 3 === 0 || selected ? (
                <Text style={[styles.tickLabel, selected ? styles.tickLabelSelected : null]}>
                  V{v}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function clampLevel(value: number): number {
  return Math.max(LEVEL_MIN, Math.min(LEVEL_MAX, Math.round(value)));
}

function Toast({
  message,
  styles,
}: {
  message: string;
  styles: ReturnType<typeof makeStyles>;
}): JSX.Element {
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={styles.toastWrap}
    >
      <View style={styles.toast}>
        <Text style={styles.toastText}>{message}</Text>
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[3],
      backgroundColor: theme.bg,
      padding: space[6],
    },
    scrollContent: {
      paddingHorizontal: space[5],
      paddingTop: space[6],
      paddingBottom: space[14],
      gap: space[5],
    },
    header: {
      gap: space[1],
    },
    eyebrow: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    title: {
      fontFamily,
      fontSize: fontSize.h2,
      fontWeight: fontWeight.extrabold,
      letterSpacing: letterSpacing.h2,
      color: theme.text,
    },
    field: {
      gap: space[2],
    },
    label: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    input: {
      minHeight: 52,
      borderRadius: radius.lg,
      backgroundColor: theme.subtle2,
      paddingHorizontal: space[4],
      paddingVertical: space[3],
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      color: theme.text,
    },
    textArea: {
      minHeight: 132,
      lineHeight: fontSize.body * 1.5,
    },
    help: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.medium,
      color: theme.text4,
    },
    counter: {
      alignSelf: 'flex-end',
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.medium,
      color: theme.text4,
    },
    sliderBlock: {
      minHeight: 96,
      borderRadius: radius.lg,
      backgroundColor: theme.subtle2,
      padding: space[4],
      gap: space[4],
    },
    sliderHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    levelValue: {
      fontFamily,
      fontSize: fontSize.h2,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: letterSpacing.h2,
    },
    sliderTrack: {
      minHeight: touchTarget.min,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    tickButton: {
      width: 24,
      minHeight: touchTarget.min,
      alignItems: 'center',
      gap: space[2],
    },
    tick: {
      width: 8,
      height: 8,
      borderRadius: radius.full,
      backgroundColor: theme.text4,
    },
    tickActive: {
      backgroundColor: theme.accent.base,
    },
    tickSelected: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.accent.base,
      borderWidth: 4,
      borderColor: theme.bg,
    },
    tickLabel: {
      fontFamily,
      fontSize: 10,
      fontWeight: fontWeight.semibold,
      color: theme.text4,
    },
    tickLabelSelected: {
      color: theme.text,
    },
    inlineErrorBox: {
      backgroundColor: withAlpha(theme.semantic.danger, 0.08),
      borderRadius: radius.md,
      padding: space[3],
      gap: space[1],
    },
    inlineErrorTitle: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
    },
    muted: {
      fontFamily,
      fontSize: fontSize.body,
      color: theme.text3,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: space[2],
      marginTop: space[2],
    },
    buttonFlex: {
      flex: 1,
    },
    errorBox: {
      margin: space[5],
      backgroundColor: withAlpha(theme.semantic.danger, 0.08),
      borderRadius: radius.lg,
      padding: space[4],
      gap: space[1],
    },
    errorTitle: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
    },
    toastWrap: {
      position: 'absolute',
      left: space[5],
      right: space[5],
      bottom: space[8],
      alignItems: 'center',
    },
    toast: {
      maxWidth: '100%',
      borderRadius: radius.xl,
      backgroundColor: theme.text,
      paddingHorizontal: space[4],
      paddingVertical: space[3],
      shadowColor: '#0F1419',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 8,
    },
    toastText: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      color: theme.bg,
      textAlign: 'center',
    },
  });
}
