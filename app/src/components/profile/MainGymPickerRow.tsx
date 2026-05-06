import React, { useCallback, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CrimpIcon } from '@/components/common/primitives';
import { t } from '@/lib/i18n';
import type { GymItem } from '@/lib/schemas/gym';
import { useTokens } from '@/lib/useTokens';

import { makeMainGymPickerRowStyles } from './mainGymPickerStyles';

type Props = {
  gym: GymItem;
  active: boolean;
  onSelect: (gym: GymItem) => void;
};

export const MainGymPickerRow = React.memo(function MainGymPickerRow({
  gym,
  active,
  onSelect,
}: Props): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeMainGymPickerRowStyles(theme), [theme]);
  const a11yParts: string[] = [gym.name];
  if (gym.brand) {
    a11yParts.push(gym.brand);
  }
  if (gym.address) {
    a11yParts.push(gym.address);
  }
  const handlePress = useCallback(() => onSelect(gym), [gym, onSelect]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={a11yParts.join(', ')}
      style={({ pressed }) => [
        styles.row,
        active ? styles.rowActive : null,
        pressed ? styles.rowPressed : null,
      ]}
    >
      <View style={styles.rowMain}>
        <Text style={styles.name} numberOfLines={1}>
          {gym.name}
        </Text>
        <Text style={styles.address} numberOfLines={1}>
          {gym.address ?? t('gym.list.addressFallback')}
        </Text>
      </View>
      {active ? <CrimpIcon.check size={20} color={theme.accent.ink} /> : null}
    </Pressable>
  );
});
