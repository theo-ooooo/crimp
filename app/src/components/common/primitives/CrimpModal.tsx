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
 *
 * <h3>fullscreen + SafeArea (PR #99 리뷰 I3)</h3>
 * fullscreen variant 는 `statusBarTranslucent` 하에 status bar 영역을 children 이 직접 책임.
 * children 측에서 `useSafeAreaInsets` 또는 `paddingTop`/`paddingBottom` 으로 노치/홈 인디케이터
 * 를 회피해야 한다. primitive 는 일반적인 frame 만 제공.
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
  /**
   * 모션 강도 — 운영 환경 또는 reducedMotion 켜진 경우 자동 'none'.
   * [PR #99 리뷰 B1] 'slide' 는 현재 분기 미구현 — 별도 슬라이드 variant 추가 시점에
   * 부활시키도록 타입에서 제거. 기본 'fade' 도 fade + 가벼운 translateY 를 같이 한다.
   */
  animationType?: 'fade' | 'none';
  /** exit 애니메이션이 끝나 RN Modal 이 완전히 내려간 직후 호출. */
  onDismissed?: () => void;
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
  onDismissed,
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

  // [PR #99 리뷰 I4] reducedMotion 의 런타임 변경이 in-flight 애니메이션을 점프시키지
  // 않도록 visible 토글 시점의 값을 ref 로 스냅샷. 시스템 설정 변경 직후 모달 토글 한 번
  // 까지는 이전 값으로 동작하지만 다음 토글부터 반영됨 — 시각적 일관성 확보.
  // [PR #101 폴리시] React 18 strict mode + concurrent rendering 안전을 위해 ref 갱신을
  // useEffect 로 이동 — 함수 본문 side-effect 는 double-render 시 의도와 다른 시점에 적용될 수
  // 있음. visible 변경 시 use*Ref.current 는 최신 값을 보장.
  const reducedMotionRef = useRef(reducedMotion);
  const animationTypeRef = useRef(animationType);
  const onDismissedRef = useRef(onDismissed);
  const pendingNativeDismissRef = useRef(false);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);
  useEffect(() => {
    animationTypeRef.current = animationType;
  }, [animationType]);
  useEffect(() => {
    onDismissedRef.current = onDismissed;
  }, [onDismissed]);

  useEffect(() => {
    const useReduced = reducedMotionRef.current || animationTypeRef.current === 'none';

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
      if (finished) {
        pendingNativeDismissRef.current = true;
        setMounted(false);
      }
    });
    // [I4] reducedMotion / animationType 은 ref 스냅샷 사용 — deps 에 두면 런타임 변경
    // 시 useEffect 재실행되며 in-flight 점프. visible 만 effect 재실행 트리거.
  }, [visible, opacity, slide]);

  // Android 하드웨어 백 — 뜬 상태에서만 가로채고 onRequestClose 호출.
  // [PR #99 리뷰 I1] visible 가 false 가 된 직후 exit 윈도우(아직 mounted=true) 에서도
  // 백 버튼이 onRequestClose 를 다시 트리거하면 닫히는 모달을 한 번 더 닫는 셈 — visible
  // 가 살아있을 때만 가로챈다.
  useEffect(() => {
    if (!visible || !mounted) {
      return undefined;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onRequestClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, mounted, onRequestClose]);

  if (!mounted) {
    return null;
  }

  const dismissable = dismissOnBackdrop ?? variant === 'centered';

  // content 슬라이드 — centered 는 살짝 위로, fullscreen 은 아래에서 위로.
  const slideTranslateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: variant === 'centered' ? [0, 12] : [0, 24],
  });

  const contentVariantStyle =
    variant === 'centered' ? styles.centered : styles.fullscreen;

  const handleNativeDismiss = () => {
    if (!pendingNativeDismissRef.current) {
      return;
    }
    pendingNativeDismissRef.current = false;
    onDismissedRef.current?.();
  };

  return (
    <RNModal
      visible
      transparent
      animationType="none"
      onDismiss={handleNativeDismiss}
      onRequestClose={onRequestClose}
      statusBarTranslucent
      testID={testID}
    >
      <Animated.View style={[styles.backdrop, { opacity }]} pointerEvents="auto">
        {dismissable ? (
          // [PR #99 리뷰 I2] dismissable 이면 backdrop 도 활성 컨트롤이라 role/label 부여 —
          // 보이스오버 사용자도 "닫기" 액션을 인지 가능.
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onRequestClose}
            accessibilityRole="button"
            accessibilityLabel="닫기"
          />
        ) : (
          // dismissable 아니면 Pressable 이 그냥 클릭 흡수 — 백드롭 위로 통과 안 됨.
          // 보이스오버 트리에선 숨김.
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        )}
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
