import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, type DimensionValue } from 'react-native';

import { motion, type Theme } from '@/lib/tokens';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTokens } from '@/lib/useTokens';

export type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
};

function makeStyles(
  theme: Theme,
  width: DimensionValue,
  height: DimensionValue,
  radius: number,
) {
  return StyleSheet.create({
    base: {
      width,
      height,
      borderRadius: radius,
      backgroundColor: theme.subtle,
      overflow: 'hidden',
    },
    staticDim: {
      opacity: 0.6,
    },
  });
}

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
}: SkeletonProps): JSX.Element {
  const theme = useTokens();
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0.5)).current;
  const styles = useMemo(
    () => makeStyles(theme, width, height, radius),
    [theme, width, height, radius],
  );

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(0.6);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: motion.duration.slow,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: motion.duration.slow,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [opacity, reducedMotion]);

  return (
    <Animated.View
      accessibilityRole="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.base, reducedMotion ? styles.staticDim : { opacity }]}
    />
  );
}
