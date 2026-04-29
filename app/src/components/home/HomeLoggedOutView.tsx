import React from 'react';
import { Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SecondaryButton } from '@/components/common/primitives';
import { t } from '@/lib/i18n';
import type { RootStackParamList } from '@/navigation/types';

import { makeHomeStyles } from './homeStyles';

type Styles = ReturnType<typeof makeHomeStyles>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: Nav;
  styles: Styles;
};

export function HomeLoggedOutView({ navigation, styles }: Props): JSX.Element {
  return (
    <View style={[styles.container, styles.center]}>
      <Text style={styles.brand}>{t('common.brand')}</Text>
      <Text style={styles.heroTagline}>{t('home.tagline')}</Text>
      <Text style={styles.heroDescription}>{t('home.description')}</Text>
      <View style={styles.heroButton}>
        <SecondaryButton
          onPress={() => navigation.navigate('Login')}
          accessibilityLabel={t('home.loginCta')}
        >
          {t('home.loginCta')}
        </SecondaryButton>
      </View>
      <Text style={styles.loginPrompt}>{t('home.loginPrompt')}</Text>
    </View>
  );
}
