import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { CrimpModal, PrimaryButton, SecondaryButton } from '@/components/common/primitives';
import { fontFamily, radius, space, withAlpha, type Theme } from '@/lib/tokens';
import { t } from '@/lib/i18n';
import { useTokens } from '@/lib/useTokens';

type Props = {
  visible: boolean;
  saving: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function MainGymClearConfirmModal({
  visible,
  saving,
  errorMessage,
  onCancel,
  onConfirm,
}: Props): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <CrimpModal
      visible={visible}
      onRequestClose={onCancel}
      dismissOnBackdrop={!saving}
      contentStyle={styles.modal}
      testID="main-gym-clear-confirm-modal"
    >
      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <Text style={styles.iconText}>!</Text>
        </View>
        <Text style={styles.title}>{t('me.mainGym.clearConfirmTitle')}</Text>
        <Text style={styles.body}>{t('me.mainGym.clearConfirmBody')}</Text>
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t('me.mainGym.errorTitle')}</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <SecondaryButton
          onPress={onCancel}
          disabled={saving}
          accessibilityLabel={t('common.cancel')}
        >
          {t('common.cancel')}
        </SecondaryButton>
        <PrimaryButton
          onPress={onConfirm}
          disabled={saving}
          accessibilityLabel={t('me.mainGym.clearCta')}
        >
          {saving ? t('me.mainGym.saving') : t('me.mainGym.clearCta')}
        </PrimaryButton>
      </View>

      {saving ? (
        <View style={styles.savingRow}>
      <ActivityIndicator color={theme.accent.base} />
        </View>
      ) : null}
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
      backgroundColor: withAlpha(theme.semantic.danger, 0.1),
    },
    iconText: {
      color: theme.semantic.danger,
      fontFamily,
      fontSize: 24,
      fontWeight: '900',
    },
    title: {
      color: theme.text,
      fontFamily,
      fontSize: 22,
      fontWeight: '800',
      textAlign: 'center',
    },
    body: {
      color: theme.text2,
      fontFamily,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
    },
    errorBox: {
      borderRadius: radius.lg,
      padding: space[4],
      backgroundColor: withAlpha(theme.semantic.danger, 0.08),
      gap: 4,
    },
    errorTitle: {
      color: theme.semantic.danger,
      fontFamily,
      fontSize: 13,
      fontWeight: '800',
    },
    errorMessage: {
      color: theme.text2,
      fontFamily,
      fontSize: 13,
      lineHeight: 18,
    },
    actions: {
      gap: space[2],
    },
    savingRow: {
      alignItems: 'center',
      marginTop: -space[2],
    },
  });
}
