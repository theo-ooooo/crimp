import React from 'react';
import { Text, View } from 'react-native';

import { PrimaryButton } from '@/components/common/primitives';
import { t } from '@/lib/i18n';

import type { LoginStyles } from './loginStyles';

type Props = {
  styles: LoginStyles;
  onGoHome: () => void;
};

export function LoginAlreadySignedInView({
  styles,
  onGoHome,
}: Props): JSX.Element {
  return (
    <View style={[styles.container, styles.center]}>
      <Text style={styles.brand}>{t('common.brand')}</Text>
      <Text style={styles.alreadyLoggedIn}>{t('auth.login.alreadyLoggedIn')}</Text>
      <View style={styles.heroButton}>
        <PrimaryButton onPress={onGoHome} accessibilityLabel={t('auth.login.goHome')}>
          {t('auth.login.goHome')}
        </PrimaryButton>
      </View>
    </View>
  );
}
