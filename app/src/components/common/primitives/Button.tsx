import React, { useMemo } from 'react';
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

type Variant = 'primary' | 'secondary';

export type ButtonProps = {
  onPress?: () => void;
  children: string;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

function makeStyles(theme: Theme, variant: Variant, disabled: boolean) {
  const bg = disabled
    ? theme.subtle2
    : variant === 'primary'
      ? theme.accent.base
      : theme.subtle;
  const fg = disabled
    ? theme.text3
    : variant === 'primary'
      ? theme.accent.on
      : theme.text;

  return StyleSheet.create({
    container: {
      width: '100%',
      minHeight: touchTarget.min,
      height: 56,
      borderRadius: 16,
      backgroundColor: bg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    label: {
      color: fg,
      fontFamily,
      fontSize: 17,
      fontWeight: variant === 'primary' ? '700' : '600',
      letterSpacing: -0.34,
    },
  });
}

function ButtonBase({
  variant,
  onPress,
  children,
  disabled = false,
  style,
  accessibilityLabel,
}: ButtonProps & { variant: Variant }): JSX.Element {
  const theme = useTokens();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(
    () => makeStyles(theme, variant, disabled),
    [theme, variant, disabled],
  );

  const renderContent = ({ pressed }: PressableStateCallbackType) => {
    const pressedStyle: ViewStyle | null =
      pressed && !disabled && !reducedMotion
        ? { transform: [{ scale: 0.98 }] }
        : null;
    return (
      <View style={[styles.container, pressedStyle, style]}>
        <Text style={styles.label} numberOfLines={1}>
          {children}
        </Text>
      </View>
    );
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={accessibilityLabel ?? children}
    >
      {renderContent}
    </Pressable>
  );
}

export function PrimaryButton(props: ButtonProps): JSX.Element {
  return <ButtonBase {...props} variant="primary" />;
}

export function SecondaryButton(props: ButtonProps): JSX.Element {
  return <ButtonBase {...props} variant="secondary" />;
}
