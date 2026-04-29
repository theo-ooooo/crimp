import React, { useCallback, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CrimpIcon } from '@/components/common/primitives';
import { makeOnboardingGymRowStyles } from '@/components/onboarding-gym/onboardingGymStyles';
import { t } from '@/lib/i18n';
import { useTokens } from '@/lib/useTokens';
import type { GymItem } from '@/lib/schemas/gym';

export const OnboardingGymRow = React.memo(function OnboardingGymRow({
  gym,
  active,
  disabled,
  onPress,
}: {
  gym: GymItem;
  active: boolean;
  disabled: boolean;
  onPress: (gym: GymItem) => void;
}): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeOnboardingGymRowStyles(theme), [theme]);

  const a11yParts: string[] = [gym.name];
  if (gym.brand) {
    a11yParts.push(gym.brand);
  }
  if (gym.address) {
    a11yParts.push(gym.address);
  }

  const handle = useCallback(() => onPress(gym), [gym, onPress]);

  return (
    <Pressable
      onPress={handle}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      accessibilityLabel={a11yParts.join(', ')}
      style={({ pressed }) => [
        styles.row,
        active ? styles.rowActive : null,
        pressed && !disabled ? styles.rowPressed : null,
      ]}
    >
      <View style={styles.rowMain}>
        <Text style={styles.name} numberOfLines={1}>
          {gym.name}
        </Text>
        <Text style={styles.address} numberOfLines={1}>
          {gym.brand ?? gym.address ?? t('gym.list.addressFallback')}
        </Text>
      </View>
      {active ? <CrimpIcon.check size={20} color={theme.accent.ink} /> : null}
    </Pressable>
  );
});
