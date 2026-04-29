import React, { useMemo } from 'react';
import { Pressable, Text, View, type PressableStateCallbackType, type ViewStyle } from 'react-native';

import { t } from '@/lib/i18n';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTokens } from '@/lib/useTokens';
import type { GymItem } from '@/lib/schemas/gym';

import { makeGymCardStyles } from '@/components/gym/gymSearchStyles';

export const GymSearchCard = React.memo(function GymSearchCard({
  gym,
  onPress,
}: {
  gym: GymItem;
  onPress: () => void;
}): JSX.Element {
  const theme = useTokens();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeGymCardStyles(theme), [theme]);

  const a11yParts: string[] = [gym.name];
  if (gym.brand) {
    a11yParts.push(gym.brand);
  }
  if (gym.address) {
    a11yParts.push(gym.address);
  }
  const accessibilityLabel = a11yParts.join(', ');

  const renderContent = ({ pressed }: PressableStateCallbackType) => {
    const pressedStyle: ViewStyle | null =
      pressed && !reducedMotion ? styles.pressed : null;
    return (
      <View style={[styles.card, pressedStyle]}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {gym.name}
          </Text>
          <Text style={styles.brand} numberOfLines={1}>
            {gym.brand ?? t('gym.list.brandFallback')}
          </Text>
        </View>
        <Text style={styles.address} numberOfLines={2}>
          {gym.address ?? t('gym.list.addressFallback')}
        </Text>
      </View>
    );
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {renderContent}
    </Pressable>
  );
});
