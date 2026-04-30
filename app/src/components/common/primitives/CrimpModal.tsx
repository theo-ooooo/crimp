import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Modal as RNModal,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { motion, radius, shadow, space, withAlpha, type Theme } from '@/lib/tokens';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTokens } from '@/lib/useTokens';

/**
 * 앱 공용 모달 primitive (PR #99, F5 PR-5 후속).
 *
 * <p>RN 의 기본 `<Modal>` 은 iOS 에서 system presentation 을 유발해 in-app 디자인과
 * 어울리지 않고, backdrop 탭/keyboard 처리/애니메이션 커스터마이즈가 어렵다. 본 컴포넌트는
 * RN Modal 을 z-stacker 로만 활용 (`transparent + animationType=none`) 하고, 그 위에
 * Animated backdrop + content 를 직접 그린다.
 *
 * <p>호출자 패턴은 RN Modal 과 가깝게 유지 (`visible` / `onRequestClose`) 해 점진 교체 용이.
 * 기존 사용처는 반복 마이그레이션 PR 로 갈아끼울 수 있다.
 *
 * <h3>Variant</h3>
 * <ul>
 *   <li>{@code centered} — 화면 중앙 다이얼로그. 권한 인트로/확인용. 기본값.</li>
 *   <li>{@code fullscreen} — 풀스크린 인앱 시트. 카메라/이미지 뷰어용.</li>
 * </ul>
 *
 * <h3>접근성</h3>
 * - Android 하드웨어 백 → {@link onRequestClose}
 * - backdrop 탭 → {@link dismissOnBackdrop} 옵션 (centered 기본 true, fullscreen 기본 false)
 * - 본 컴포넌트는 자체 트랩/포커스 처리 X — 컨텐츠 측에서 a11yLabel/role 부여
 */

export type CrimpModalVariant = 'centered' | 'fullscreen';

export type CrimpModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  /** 표시 형식. 기본 `centered`. */
  variant?: CrimpModalVariant;
  /** backdrop 탭으로 닫을지. 기본: centered=true, fullscreen=false. */
  dismissOnBackdrop?: boolean;
  /** content container 추가 스타일 — variant 별 기본 스타일 위에 덮어쓴다. */
  contentStyle?: ViewStyle;
  /** 모션 강도 — 운영 환경 또는 reducedMotion 켜진 경우 자동 'none'. */
  animationType?: 'fade' | 'slide' | 'none';
  testID?: string;
};

const FADE_IN_DURATION = motion.duration.fast;
const FADE_OUT_DURATION = motion.duration.fast;
const SLIDE_IN_DURATION = motion.duration.normal;
const SLIDE_OUT_DURATION = motion.duration.fast;

export function CrimpModal({
  visible,
  onRequestClose,
  children,
  variant = 'centered',
  dismissOnBackdrop,
  contentStyle,
  animationType = 'fade',
  testID,
}: CrimpModalProps): JSX.Element | null {
  const theme = useTokens();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // Animated values — 한 번만 생성하고 재사용. visible 토글에 따라 0↔1 로 보간.
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const slide = useRef(new Animated.Value(visible ? 0 : 1)).current;

  // RN Modal 의 visible 를 우리가 직접 제어 — exit 애니메이션 끝까지 유지하기 위해
  // 내부 mounted 상태를 별도로 두고 애니메이션 종료 시 unmount.
  const [mounted, setMounted] = React.useState(visible);

  useEffect(() => {
    if (visible && !mounted) {
      setMounted(true);
    }
  }, [visible, mounted]);

  useEffect(() => {
    const useReduced = reducedMotion || animationType === 'none';

    if (visible) {
      // Enter: backdrop fade-in + content slide/fade
      const enterDur = useReduced ? 0 : FADE_IN_DURATION;
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: enterDur,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: 0,
          duration: useReduced ? 0 : SLIDE_IN_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    // Exit: 모두 페이드아웃 후 unmount.
    const exitDur = useReduced ? 0 : FADE_OUT_DURATION;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: exitDur,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 1,
        duration: useReduced ? 0 : SLIDE_OUT_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, reducedMotion, animationType, opacity, slide]);

  // Android 하드웨어 백 — 뜬 상태에서만 가로채고 onRequestClose 호출.
  useEffect(() => {
    if (!mounted) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onRequestClose();
      return true;
    });
    return () => sub.remove();
  }, [mounted, onRequestClose]);

  if (!mounted) return null;

  const dismissable = dismissOnBackdrop ?? variant === 'centered';

  // content 슬라이드 — centered 는 살짝 위로, fullscreen 은 아래에서 위로.
  const slideTranslateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: variant === 'centered' ? [0, 12] : [0, 24],
  });

  const contentVariantStyle =
    variant === 'centered' ? styles.centered : styles.fullscreen;

  return (
    <RNModal
      visible
      transparent
      animationType="none"
      onRequestClose={onRequestClose}
      statusBarTranslucent
      testID={testID}
    >
      <Animated.View style={[styles.backdrop, { opacity }]} pointerEvents="auto">
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissable ? onRequestClose : undefined}
          // dismissable 아니면 Pressable 이 그냥 클릭 흡수 — 백드롭 위로 통과 안 됨.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </Animated.View>

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.contentLayer,
          contentVariantStyle,
          { opacity, transform: [{ translateY: slideTranslateY }] },
        ]}
      >
        {variant === 'centered' ? (
          // centered 는 padded card. shadow + radius + bg 까지 primitive 가 책임.
          <View style={[styles.centeredBox, contentStyle]}>{children}</View>
        ) : (
          // fullscreen 은 children 이 자체 레이아웃을 결정 — primitive 는 framing 만.
          <View style={[styles.fullscreenBox, contentStyle]}>{children}</View>
        )}
      </Animated.View>
    </RNModal>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: withAlpha('#0F1419', 0.45),
    },
    contentLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space[6],
    },
    fullscreen: {
      // children 이 화면 전체를 사용 — flex stretch.
    },
    centeredBox: {
      backgroundColor: theme.bg,
      borderRadius: radius.xl,
      padding: space[6],
      maxWidth: 480,
      width: '100%',
      ...shadow.lg,
    },
    fullscreenBox: {
      flex: 1,
      backgroundColor: theme.bg,
    },
  });
}
