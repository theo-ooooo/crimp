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
    const avatarText = Array.from(gym.name)[0] ?? 'G';
    const distanceText = formatDistance(gym.distanceMeters);
    const ratingText = gym.rating !== null ? `★ ${gym.rating.toFixed(1)}` : null;
    const friendText = `${gym.monthlyUserCount}명 다녀감`;
    return (
      <View style={[styles.card, pressedStyle]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText} allowFontScaling={false}>
            {avatarText}
          </Text>
        </View>
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>
              {gym.name}
            </Text>
            <Text style={styles.brand} numberOfLines={1}>
              {gym.brand ?? t('gym.list.brandFallback')}
            </Text>
          </View>
          <Text style={styles.address} numberOfLines={1}>
            {gym.address ?? t('gym.list.addressFallback')}
          </Text>
          <View style={styles.metaRow}>
            {distanceText ? <Text style={styles.metaText}>{distanceText}</Text> : null}
            {distanceText && (ratingText || friendText) ? <View style={styles.metaDot} /> : null}
            {ratingText ? <Text style={styles.metaText}>{ratingText}</Text> : null}
            {(ratingText || distanceText) && friendText ? <View style={styles.metaDot} /> : null}
            <Text style={styles.metaText}>{friendText}</Text>
          </View>
        </View>
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

function formatDistance(distanceMeters: number | null): string | null {
  if (distanceMeters === null || Number.isNaN(distanceMeters)) {
    return null;
  }
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)}m`;
  }
  return `${(distanceMeters / 1000).toFixed(distanceMeters >= 10000 ? 0 : 1)}km`;
}
