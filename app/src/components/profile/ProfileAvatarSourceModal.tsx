import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CrimpModal, PrimaryButton, SecondaryButton } from '@/components/common/primitives';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontSize,
  fontWeight,
  radius,
  space,
  withAlpha,
  type Theme,
} from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';

type Props = {
  visible: boolean;
  disabled: boolean;
  onCamera: () => void;
  onLibrary: () => void;
  onCancel: () => void;
  onDismissed?: () => void;
};

export function ProfileAvatarSourceModal({
  visible,
  disabled,
  onCamera,
  onLibrary,
  onCancel,
  onDismissed,
}: Props): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <CrimpModal
      visible={visible}
      onRequestClose={onCancel}
      dismissOnBackdrop={!disabled}
      contentStyle={styles.modal}
      onDismissed={onDismissed}
      testID="profile-avatar-source-modal"
    >
      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <Text style={styles.iconText}>+</Text>
        </View>
        <Text style={styles.title}>{t('profile.edit.avatarSourceTitle')}</Text>
        <Text style={styles.body}>{t('profile.edit.avatarSourceBody')}</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton onPress={onCamera} disabled={disabled}>
          {t('profile.edit.avatarCamera')}
        </PrimaryButton>
        <SecondaryButton onPress={onLibrary} disabled={disabled}>
          {t('profile.edit.avatarLibrary')}
        </SecondaryButton>
        <SecondaryButton onPress={onCancel} disabled={disabled}>
          {t('common.cancel')}
        </SecondaryButton>
      </View>
    </CrimpModal>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    modal: {
      width: '88%',
      maxWidth: 360,
      padding: space[6],
      gap: space[5],
    },
    header: {
      alignItems: 'center',
      gap: space[2],
    },
    iconBadge: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(theme.accent.base, 0.16),
    },
    iconText: {
      color: theme.accent.base,
      fontFamily,
      fontSize: 28,
      fontWeight: fontWeight.extrabold,
      includeFontPadding: false,
    },
    title: {
      color: theme.text,
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.extrabold,
      textAlign: 'center',
    },
    body: {
      color: theme.text2,
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      lineHeight: 22,
      textAlign: 'center',
    },
    actions: {
      gap: space[2],
    },
  });
}
