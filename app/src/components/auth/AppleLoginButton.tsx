import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from 'react-native';

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
 *   <li>최소 높이 44pt — 56pt 로 충족.</li>
 *   <li>로고 + 텍스트 좌우 배치, 텍스트는 시스템 SF Pro 권장 — 본 앱은 fontFamily 토큰 사용.</li>
 *   <li><b>Apple 로고는 필수</b> — App Store Review Guideline 4.8. 본 컴포넌트는 iOS 전용
 *       조건에서만 렌더되므로 Apple PUA 코드포인트 U+F8FF () 를 사용 — iOS 의 SF Pro 가
 *       렌더 시 Apple 로고로 자동 치환. Android 에서는 tofu 로 보이지만 컴포넌트가
 *       null 반환이라 영향 없음.</li>
 * </ul>
 */

type Props = {
  onPress: () => void;
  loading: boolean;
  accessibilityLabel: string;
};

const APPLE_BLACK = '#000000';
const APPLE_WHITE = '#FFFFFF';
// [PR #104 리뷰 B1] Apple 로고 글리프 — Apple PUA 코드포인트 U+F8FF.
// iOS 의 SF Pro 가 자동으로 Apple 로고로 렌더. App Store Review 4.8 충족.
// Unicode escape 로 박아 editor/diff 도구에서 빈 문자열로 오인되지 않게 함 (실제 단일 char).
const APPLE_LOGO_GLYPH = '\uF8FF';

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
          <Text style={styles.mark} allowFontScaling={false}>{APPLE_LOGO_GLYPH}</Text>
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
  mark: {
    fontSize: 22,
    color: APPLE_WHITE,
    lineHeight: 26,
  },
  label: {
    fontFamily,
    fontSize: 16,
    fontWeight: fontWeight.bold,
    color: APPLE_WHITE,
  },
});
