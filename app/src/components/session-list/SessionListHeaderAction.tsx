import React, { useMemo } from 'react';
import { Pressable } from 'react-native';

import { CrimpIcon } from '@/components/common/primitives';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTokens } from '@/lib/useTokens';

import { makeSessionListStyles } from './sessionListStyles';

export function SessionListHeaderAction({
  onPress,
  accessibilityLabel,
}: {
  onPress: () => void;
  accessibilityLabel: string;
}): JSX.Element {
  const theme = useTokens();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeSessionListStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconAction,
        pressed && !reducedMotion ? styles.iconActionPressed : null,
      ]}
    >
      <CrimpIcon.plus size={22} color={theme.text} />
    </Pressable>
  );
}
