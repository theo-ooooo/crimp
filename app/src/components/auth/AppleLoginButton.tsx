import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/lib/i18n';
import { fontFamily, fontWeight, radius, space } from '@/lib/tokens';

/**
 * Apple Sign In 버튼 (PR #104, F-D3).
 *
 * <p>iOS 13+ 전용 — Android 에서는 렌더링 자체를 호출 측에서 차단 (visible 으로 false 처리).
 * Apple HIG 의 Sign In with Apple 가이드라인:
 * <ul>
 *   <li>버튼 색: 검정 또는 흰색 (앱 톤에 맞게). Crimp 는 다크/라이트 모두 검은 배경 + 흰 텍스트
 *       조합으로 통일성 (KakaoLoginButton 의 노랑/검정과 시각적 구분).</li>
 *   <li>최소 높이 44pt, 최소 너비 140pt — RN spacing token 으로 충족.</li>
 *   <li>로고 + 텍스트 좌우 배치, 텍스트는 시스템 SF Pro 권장 — 본 앱은 fontFamily 토큰 사용.</li>
 * </ul>
 *
 * <p>실 Apple Logo SVG 는 향후 react-native-svg 도입 시 교체. 현재는 단순 텍스트 마크.
 */

type Props = {
  onPress: () => void;
  loading: boolean;
  accessibilityLabel: string;
};

const APPLE_BLACK = '#000000';
const APPLE_WHITE = '#FFFFFF';

export function AppleLoginButton({
  onPress,
  loading,
  accessibilityLabel,
}: Props): JSX.Element | null {
  // [PR #104] iOS 만 노출 — Android 에서는 별도 web flow 가 필요해 본 PR 의 scope 외.
  if (Platform.OS !== 'ios') {
    return null;
  }
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
        <ActivityIndicator color={APPLE_WHITE} />
      ) : (
        <>
          <View style={styles.markCircle}>
            <Text style={styles.mark} allowFontScaling={false}>
              {''}
            </Text>
          </View>
          <Text style={styles.label}>{t('auth.login.appleCta')}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: APPLE_BLACK,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[5],
    gap: space[2],
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
  markCircle: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    fontSize: 22,
    color: APPLE_WHITE,
    lineHeight: 22,
  },
  label: {
    fontFamily,
    fontSize: 16,
    fontWeight: fontWeight.bold,
    color: APPLE_WHITE,
  },
});
