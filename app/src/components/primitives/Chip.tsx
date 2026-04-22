import React, { type ReactNode, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableStateCallbackType,
  type ViewStyle,
} from 'react-native';

import { fontFamily, touchTarget, type Theme } from '@/lib/tokens';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTokens } from '@/lib/useTokens';

export type ChipProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
  accessibilityLabel?: string;
};

function makeStyles(theme: Theme, active: boolean) {
  return StyleSheet.create({
    pressable: {
      minHeight: touchTarget.min,
      justifyContent: 'center',
    },
    container: {
      height: 36,
      paddingHorizontal: 14,
      borderRadius: 18,
      backgroundColor: active ? theme.text : theme.chip,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
    },
    pressed: {
      opacity: 0.85,
    },
    label: {
      color: active ? theme.bg : theme.text2,
      fontFamily,
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: -0.14,
    },
  });
}

export function Chip({
  label,
  active = false,
  onPress,
  icon,
  accessibilityLabel,
}: ChipProps): JSX.Element {
  const theme = useTokens();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeStyles(theme, active), [theme, active]);

  // hitSlop 으로 최소 44x44 터치 타겟 확보 (실제 높이 36).
  const hitSlop = { top: 4, bottom: 4, left: 4, right: 4 };

  const renderContent = ({ pressed }: PressableStateCallbackType) => {
    const pressedStyle: ViewStyle | null =
      pressed && !reducedMotion ? styles.pressed : null;
    return (
      <View style={[styles.container, pressedStyle]}>
        {icon}
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: !onPress }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={styles.pressable}
    >
      {renderContent}
    </Pressable>
  );
}
