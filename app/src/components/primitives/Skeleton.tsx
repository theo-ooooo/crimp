import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, type DimensionValue } from 'react-native';

import { motion, type Theme } from '@/lib/tokens';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTokens } from '@/lib/useTokens';

/**
 * 로딩 플레이스홀더.
 * - 기본: opacity 0.5↔1 로 느슨한 펄스 (reduced-motion 시 정적 0.6 으로 고정).
 * - 쉐이더·LinearGradient 없이 단색 Animated.View 로 구현 → 번들 영향 0.
 */
export type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
};

const MIN_OPACITY = 0.5;
const MAX_OPACITY = 1.0;
const STATIC_OPACITY = 0.6;

function createPulseLoop(
  opacity: Animated.Value,
  duration: number,
): Animated.CompositeAnimation {
  const step = (toValue: number) =>
    Animated.timing(opacity, { toValue, duration, useNativeDriver: true });
  return Animated.loop(Animated.sequence([step(MAX_OPACITY), step(MIN_OPACITY)]));
}

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
      opacity: STATIC_OPACITY,
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
  const opacity = useRef(new Animated.Value(MIN_OPACITY)).current;
  const styles = useMemo(
    () => makeStyles(theme, width, height, radius),
    [theme, width, height, radius],
  );

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(STATIC_OPACITY);
      return;
    }
    const loop = createPulseLoop(opacity, motion.duration.slow);
    loop.start();
    return () => loop.stop();
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
