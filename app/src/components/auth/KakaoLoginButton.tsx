import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/lib/i18n';
import { fontFamily, fontWeight, radius, space } from '@/lib/tokens';

type Props = {
  onPress: () => void;
  loading: boolean;
  accessibilityLabel: string;
};

const KAKAO_YELLOW = '#FEE500';
const KAKAO_INK = '#191919';

export function KakaoLoginButton({
  onPress,
  loading,
  accessibilityLabel,
}: Props): JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: loading }}
      style={({ pressed }) => [
        styles.base,
        pressed && !loading ? styles.pressed : null,
        loading ? styles.disabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={KAKAO_INK} />
      ) : (
        <>
          <View style={styles.markCircle} />
          <Text style={styles.label}>{t('auth.login.kakaoCta')}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: KAKAO_YELLOW,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
  markCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: KAKAO_INK,
  },
  label: {
    fontFamily,
    fontSize: 17,
    fontWeight: fontWeight.bold,
    color: KAKAO_INK,
    letterSpacing: -0.2,
  },
});
