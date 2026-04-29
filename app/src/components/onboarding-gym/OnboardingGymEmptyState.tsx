import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import { CrimpIcon } from '@/components/common/primitives';
import { makeOnboardingGymEmptyStyles } from '@/components/onboarding-gym/onboardingGymStyles';
import { t } from '@/lib/i18n';
import { useTokens } from '@/lib/useTokens';

export function OnboardingGymEmptyState(): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeOnboardingGymEmptyStyles(theme), [theme]);
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <CrimpIcon.search size={28} color={theme.text3} />
      </View>
      <Text style={styles.title}>{t('onboarding.mainGym.emptyTitle')}</Text>
      <Text style={styles.body}>{t('onboarding.mainGym.emptyBody')}</Text>
    </View>
  );
}
