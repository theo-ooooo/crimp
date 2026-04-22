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

/**
 * 필터·태그 pill.
 *
 * Props:
 * - `active`: 선택 상태. 활성화 시 `theme.text` 배경 + `theme.bg` 텍스트로 대비 최대.
 *   선택됨을 **색만으로 전달하지 않도록** `accessibilityState.selected` 도 동시 표시.
 * - `onPress` 미제공: 정보 칩(표시 전용) 로 해석 — Pressable 을 `disabled` 상태로 두어
 *   탭 피드백·제스처를 차단한다. `accessibilityState.disabled=true` 로도 표기되어
 *   스크린리더가 "비활성" 이라 안내한다. 의도적으로 탭 불가능한 태그(예: "서울")
 *   에 이 패턴을 쓴다.
 */
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
      alignSelf: 'flex-start',
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
      // 선택 상태를 색 외에 "살짝 볼록한 그림자" 로도 전달 → 색맹·저채도 모드 대응.
      ...(active
        ? {
            shadowColor: theme.text,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.14,
            shadowRadius: 6,
            elevation: 2,
          }
        : null),
    },
    checkDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.bg,
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
        {/* active 시 앞에 작은 점으로 이중 시각 단서 제공 */}
        {active ? <View style={styles.checkDot} /> : null}
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
