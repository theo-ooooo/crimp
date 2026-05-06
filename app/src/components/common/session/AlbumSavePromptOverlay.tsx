import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

export type AlbumSavePromptOverlayProps = {
  visible: boolean;
  saving: boolean;
  errorVisible: boolean;
  onSave: () => void;
  onSkip: () => void;
};

export function AlbumSavePromptOverlay({
  visible,
  saving,
  errorVisible,
  onSave,
  onSkip,
}: AlbumSavePromptOverlayProps): JSX.Element | null {
  const theme = useTokens();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const slide = useRef(new Animated.Value(visible ? 0 : 1)).current;
  const reducedMotionRef = useRef(reducedMotion);
  const [mounted, setMounted] = React.useState(visible);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

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
        <View style={styles.card} accessibilityViewIsModal accessibilityLiveRegion="polite">
          <Text style={styles.title} accessibilityRole="header">
            {t('session.log.albumSavePromptTitle')}
          </Text>
          <Text style={styles.body}>{t('session.log.albumSavePromptBody')}</Text>
          {errorVisible ? (
            <Text style={styles.errorText}>{t('session.log.albumSaveFailedBody')}</Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              onPress={onSkip}
              disabled={saving}
              style={[styles.btn, styles.btnGhost, saving && styles.btnDisabled]}
              accessibilityRole="button"
              accessibilityLabel={t('session.log.albumSavePromptSkip')}
              accessibilityState={{ disabled: saving }}
            >
              <Text style={styles.btnGhostLabel}>
                {t('session.log.albumSavePromptSkip')}
              </Text>
            </Pressable>
            <Pressable
              onPress={onSave}
              disabled={saving}
              style={[styles.btn, styles.btnPrimary, saving && styles.btnDisabled]}
              accessibilityRole="button"
              accessibilityLabel={
                saving
                  ? t('session.log.capturePreviewSaving')
                  : t('session.log.albumSavePromptSave')
              }
              accessibilityState={{ busy: saving, disabled: saving }}
            >
              {saving ? (
                <ActivityIndicator color={theme.accent.on} />
              ) : (
                <Text style={styles.btnPrimaryLabel}>
                  {t('session.log.albumSavePromptSave')}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Animated.View>
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
    errorText: {
      fontFamily,
      fontSize: 13,
      lineHeight: 19,
      color: theme.semantic.danger,
      marginBottom: space[4],
    },
    actions: {
      flexDirection: 'row',
      gap: space[3],
    },
    btn: {
      flex: 1,
      minHeight: 48,
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
    btnDisabled: {
      opacity: 0.55,
    },
  });
}
