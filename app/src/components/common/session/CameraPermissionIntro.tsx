import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { PermStatus } from '@/hooks/permissions/useCameraEntryPermissions';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontWeight,
  motion,
  radius,
  shadow,
  space,
  withAlpha,
  type Theme,
} from '@/lib/tokens';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTokens } from '@/lib/useTokens';

/**
 * 카메라 진입 시 권한 안내 인트로 (PR #100, F5 PR-B).
 *
 * <p>본 컴포넌트는 부모(CameraSheet)의 RN Modal 안에서 동작하도록 **inline overlay** 로
 * 그린다. RN Modal 중첩(`<Modal>` 안에 또 `<Modal>`) 은 iOS 에서 underlying modal 이 가려지는
 * known limitation 이 있어 CrimpModal primitive 를 쓰지 않는다.
 *
 * <p>visibility 토글 시 자체 Animated backdrop + content 페이드(+slide). reducedMotion
 * 켜져있으면 즉시 토글.
 *
 * <p>한 번이라도 영구 거부({@link PermStatus#blocked})된 권한이 있으면 OS 다이얼로그가
 * 다시 뜨지 않으니 "허용" 버튼이 시스템 설정 진입으로 동작.
 */

export type CameraPermissionIntroProps = {
  visible: boolean;
  cameraStatus: PermStatus;
  microphoneStatus: PermStatus;
  locationStatus: PermStatus;
  onAllow: () => void;
  onSkip: () => void;
};

export function CameraPermissionIntro({
  visible,
  cameraStatus,
  microphoneStatus,
  locationStatus,
  onAllow,
  onSkip,
}: CameraPermissionIntroProps): JSX.Element | null {
  const theme = useTokens();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const slide = useRef(new Animated.Value(visible ? 0 : 1)).current;
  // [PR #101 폴리시] CrimpModal 과 동일 — ref 갱신을 useEffect 로 이동해 React 18 strict
  // mode + concurrent rendering 안전 확보.
  const reducedMotionRef = useRef(reducedMotion);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);
  const [mounted, setMounted] = React.useState(visible);

  useEffect(() => {
    if (visible && !mounted) {
      setMounted(true);
    }
  }, [visible, mounted]);

  useEffect(() => {
    const useReduced = reducedMotionRef.current;
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: useReduced ? 0 : motion.duration.fast,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: 0,
          duration: useReduced ? 0 : motion.duration.normal,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: useReduced ? 0 : motion.duration.fast,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 1,
        duration: useReduced ? 0 : motion.duration.fast,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [visible, opacity, slide]);

  if (!mounted) {
    return null;
  }

  // blocked 가 하나라도 있으면 OS 다이얼로그가 안 뜨므로 "설정으로 이동" 으로 대체.
  const hasBlocked = [cameraStatus, microphoneStatus, locationStatus].some(
    (s) => s === 'blocked',
  );

  const slideTranslateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 12],
  });

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.contentLayer,
          { opacity, transform: [{ translateY: slideTranslateY }] },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">
            {t('session.log.permIntroTitle')}
          </Text>
          <Text style={styles.body}>{t('session.log.permIntroBody')}</Text>

          <View style={styles.itemsBox}>
            <PermItem
              label={t('session.log.permIntroCamera')}
              status={cameraStatus}
              styles={styles}
            />
            <PermItem
              label={t('session.log.permIntroMicrophone')}
              status={microphoneStatus}
              styles={styles}
            />
            <PermItem
              label={t('session.log.permIntroLocation')}
              status={locationStatus}
              styles={styles}
            />
          </View>

          <Text style={styles.note}>{t('session.log.permIntroNote')}</Text>

          <View style={styles.actions}>
            <Pressable
              onPress={onSkip}
              style={[styles.btn, styles.btnGhost]}
              accessibilityRole="button"
              accessibilityLabel={t('session.log.permIntroSkip')}
            >
              <Text style={styles.btnGhostLabel}>
                {t('session.log.permIntroSkip')}
              </Text>
            </Pressable>
            <Pressable
              onPress={hasBlocked ? () => Linking.openSettings() : onAllow}
              style={[styles.btn, styles.btnPrimary]}
              accessibilityRole="button"
              accessibilityLabel={
                hasBlocked
                  ? t('session.log.cameraPermissionSettings')
                  : t('session.log.permIntroAllow')
              }
            >
              <Text style={styles.btnPrimaryLabel}>
                {hasBlocked
                  ? t('session.log.cameraPermissionSettings')
                  : t('session.log.permIntroAllow')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function PermItem({
  label,
  status,
  styles,
}: {
  label: string;
  status: PermStatus;
  styles: ReturnType<typeof makeStyles>;
}) {
  const dotStyle =
    status === 'granted' || status === 'limited'
      ? styles.itemDotGranted
      : status === 'blocked'
        ? styles.itemDotBlocked
        : styles.itemDotDenied;
  return (
    <View style={styles.item}>
      <View style={[styles.itemDot, dotStyle]} />
      <Text style={styles.itemLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: withAlpha('#0F1419', 0.5),
    },
    contentLayer: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space[6],
    },
    card: {
      backgroundColor: theme.bg,
      borderRadius: radius.xl,
      padding: space[6],
      maxWidth: 480,
      width: '100%',
      ...shadow.lg,
    },
    title: {
      fontFamily,
      fontSize: 18,
      fontWeight: fontWeight.bold,
      color: theme.text,
      marginBottom: space[2],
    },
    body: {
      fontFamily,
      fontSize: 14,
      lineHeight: 20,
      color: theme.text2,
      marginBottom: space[4],
    },
    itemsBox: {
      gap: space[2],
      marginBottom: space[4],
      paddingVertical: space[2],
      paddingHorizontal: space[3],
      borderRadius: radius.md,
      backgroundColor: theme.subtle,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
    },
    itemDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    itemDotGranted: {
      backgroundColor: theme.semantic.success,
    },
    itemDotDenied: {
      backgroundColor: theme.text3,
    },
    itemDotBlocked: {
      backgroundColor: theme.semantic.danger,
    },
    itemLabel: {
      fontFamily,
      fontSize: 14,
      color: theme.text,
      flex: 1,
    },
    note: {
      fontFamily,
      fontSize: 12,
      color: theme.text3,
      marginBottom: space[5],
    },
    actions: {
      flexDirection: 'row',
      gap: space[3],
    },
    btn: {
      flex: 1,
      paddingVertical: space[3] + 2,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnGhost: {
      backgroundColor: theme.subtle,
    },
    btnGhostLabel: {
      fontFamily,
      fontSize: 15,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    btnPrimary: {
      backgroundColor: theme.accent.base,
    },
    btnPrimaryLabel: {
      fontFamily,
      fontSize: 15,
      fontWeight: fontWeight.extrabold,
      color: theme.accent.on,
    },
  });
}
