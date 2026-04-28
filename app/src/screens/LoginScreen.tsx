import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { PrimaryButton, SecondaryButton } from '@/components/primitives';
import { useExchangeOauth } from '@/hooks/useAuth';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
  withAlpha,
  type Theme,
} from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';
import type { RootStackParamList } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

/**
 * Kakao 네이티브 SDK 의 `login` 함수.
 *
 * - 네이티브 모듈이 링크되지 않은 빌드(예: Metro 만 띄우고 ios/android 가 없는 워크트리)
 *   에서도 화면이 동작하도록 require 를 try/catch 로 감싼다.
 * - 실패 시 `null` 로 두고, UI 는 "dev 토큰 입력" 만 노출한다.
 */
type KakaoTokenLike = { idToken?: string | null; accessToken?: string | null };
/**
 * Kakao SDK 의 `login(nonce?)` 를 부르는 시그니처.
 *
 * `@react-native-seoul/kakao-login` 의 nonce 인자는 본 저장소의 `patches/` 패치로
 * 추가됨 — Kakao Android/iOS SDK 의 `loginWithKakaoTalk/Account` 가 nonce 를 받지
 * 않으면 OpenID Connect 응답(idToken) 을 안 줘서, 백엔드의 OIDC id_token 검증
 * 흐름이 항상 비어있는 idToken 으로 깨졌다. 패치는 nonce 를 그대로 SDK 에 전달.
 */
type KakaoLoginFn = (nonce?: string | null) => Promise<KakaoTokenLike>;

let kakaoLogin: KakaoLoginFn | null = null;
try {
  const mod: { login?: KakaoLoginFn } = require('@react-native-seoul/kakao-login');
  kakaoLogin = typeof mod.login === 'function' ? mod.login : null;
} catch {
  kakaoLogin = null;
}

/**
 * Kakao OIDC 요청에 첨부할 1회용 nonce 생성.
 *
 * Phase 1: 백엔드는 nonce 클레임을 별도로 검증하지 않으므로(NimbusJwtDecoder
 * 는 issuer/audience/exp 만 본다) 클라가 임의 임시값을 만들어 보내기만 하면
 * Kakao 서버가 idToken 응답에 채워준다. `crypto.getRandomValues` 가 RN 에는
 * 없을 수 있어 `Math.random` 기반의 16자리 영숫자로 대체한다 (CSPRNG 이 아니지만
 * idToken 발급 트리거 용도로 충분, 보안 검증은 향후 백엔드 nonce 도입 시 강화).
 */
function generateKakaoNonce(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 16; i += 1) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

/**
 * 로그인 화면.
 *
 * 디자인 출처: docs/design/claude/v2/screens-ios-2.jsx:6 (`LoginScreen`)
 *
 * Mock 레이아웃:
 * - 상단(hero): 브랜드 마크 + 큰 H1 헤드라인 + 보조 문구
 * - 하단(CTA): 카카오 1차 버튼 + 약관 안내
 * - 사이 영역(scroll): notice / error / dev-mode 토글 (PR #49 의 dev token 폴백 보존)
 *
 * 행위는 무변경 — 기존 `useExchangeOauth` mutation, `kakaoLogin` 폴백 require, dev 토큰
 * 패널, 이미 로그인 시 홈 redirect 는 그대로 유지하고 시각만 v2 mock 에 맞춘다.
 */
export default function LoginScreen(): JSX.Element {
  const theme = useTokens();
  const navigation = useNavigation<Nav>();
  const accessToken = useTokenStore((s) => s.accessToken);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const exchange = useExchangeOauth();
  const [devOpen, setDevOpen] = useState(false);
  const [devToken, setDevToken] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 이미 로그인되어 있으면 즉시 홈으로 — 사용자가 LoggedOutView "로그인" 을 잘못 눌러
  // 진입한 경우 등에 대비.
  if (accessToken) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.brand}>{t('common.brand')}</Text>
        <Text style={styles.alreadyLoggedIn}>{t('auth.login.alreadyLoggedIn')}</Text>
        <View style={styles.heroButton}>
          <PrimaryButton
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
            accessibilityLabel={t('auth.login.goHome')}
          >
            {t('auth.login.goHome')}
          </PrimaryButton>
        </View>
      </View>
    );
  }

  const submitIdToken = async (idToken: string) => {
    setErrorMessage(null);
    try {
      await exchange.mutateAsync({ provider: 'kakao', idToken });
      // I2: 성공 시 dev 토큰 입력 cleanup — 다음 진입 때 stale 값이 남지 않도록.
      setDevToken('');
      setDevOpen(false);
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (err) {
      setErrorMessage(toUserMessage(err));
    }
  };

  const onKakaoPress = async () => {
    if (!kakaoLogin) {
      // 네이티브 미링크 — dev 폴백 패널을 자동으로 열어 사용자를 안내.
      setDevOpen(true);
      setErrorMessage(t('auth.login.kakaoUnavailable'));
      return;
    }
    setErrorMessage(null);
    try {
      const result = await kakaoLogin(generateKakaoNonce());
      const idToken = result?.idToken;
      if (!idToken) {
        setErrorMessage(t('auth.login.kakaoNoIdToken'));
        return;
      }
      await submitIdToken(idToken);
    } catch (err) {
      setErrorMessage(toUserMessage(err));
    }
  };

  const onDevSubmit = async () => {
    const trimmed = devToken.trim();
    if (trimmed.length === 0) {
      return;
    }
    await submitIdToken(trimmed);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Hero — 브랜드 + 헤드라인 (mock: paddingTop 120, padding 0 24) */}
      <View style={styles.heroBlock}>
        <Text style={styles.brand} accessibilityRole="header">
          {t('common.brand')}
        </Text>
        <Text style={styles.headline}>
          {t('auth.login.headlineLine1')}
          {'\n'}
          {t('auth.login.headlineLine2')}
        </Text>
        <Text style={styles.subDescription}>
          {t('auth.login.subDescription')}
        </Text>
      </View>

      {/* 네이티브 SDK 미연결 알림 (dev 빌드 한정) */}
      {kakaoLogin === null ? (
        <View style={styles.noticeCard} accessibilityRole="alert">
          <Text style={styles.noticeTitle}>{t('auth.login.nativeUnlinkedTitle')}</Text>
          <Text style={styles.noticeBody}>{t('auth.login.nativeUnlinkedBody')}</Text>
        </View>
      ) : null}

      {/* CTA + 약관 (mock: 하단 padding 0 20, gap 10) */}
      <View style={styles.ctaBlock}>
        <PrimaryButton
          onPress={onKakaoPress}
          disabled={exchange.isPending}
          accessibilityLabel={t('auth.login.kakaoCta')}
        >
          {exchange.isPending
            ? t('auth.login.exchanging')
            : t('auth.login.kakaoCta')}
        </PrimaryButton>
        <Text style={styles.termsNotice}>{t('auth.login.termsNotice')}</Text>
      </View>

      {errorMessage ? (
        <View style={styles.errorCard} accessibilityRole="alert">
          <Text style={styles.errorTitle}>{t('auth.login.errorTitle')}</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Dev 모드 폴백 — Phase 1 동안 유지 (PR #49). */}
      <View style={styles.devSection}>
        <Pressable
          onPress={() => setDevOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={t('auth.login.devModeToggle')}
          accessibilityState={{ expanded: devOpen }}
          style={({ pressed }) => [
            styles.devToggle,
            pressed ? styles.devTogglePressed : null,
          ]}
        >
          <Text style={styles.devToggleLabel}>
            {devOpen ? t('auth.login.devModeHide') : t('auth.login.devModeToggle')}
          </Text>
        </Pressable>

        {devOpen ? (
          <View style={styles.devPanel}>
            <Text style={styles.devHint}>{t('auth.login.devModeHint')}</Text>
            <Text style={styles.devLabel}>{t('auth.login.devTokenLabel')}</Text>
            <TextInput
              value={devToken}
              onChangeText={setDevToken}
              placeholder={t('auth.login.devTokenPlaceholder')}
              placeholderTextColor={theme.text4}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              style={styles.devInput}
              accessibilityLabel={t('auth.login.devTokenLabel')}
            />
            <View style={styles.devSubmit}>
              <SecondaryButton
                onPress={onDevSubmit}
                disabled={exchange.isPending || devToken.trim().length === 0}
                accessibilityLabel={t('auth.login.devSubmit')}
              >
                {t('auth.login.devSubmit')}
              </SecondaryButton>
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: space[6],
      gap: space[3],
    },
    /**
     * Mock paddingTop 120 + paddingBottom 60 ≒ space[20] (80) / space[14] (56).
     * 모바일 safe-area + 작은 화면 호환을 위해 hero 영역 위쪽 80, 아래쪽 56.
     */
    scrollContent: {
      paddingHorizontal: space[6],
      paddingTop: space[20],
      paddingBottom: space[14],
      gap: space[8],
    },
    /** Hero block — 브랜드/헤드라인/설명. Mock gap: 32 + 12 ≒ space[8]/space[3]. */
    heroBlock: {
      gap: space[3],
    },
    brand: {
      fontFamily,
      fontSize: fontSize.h1,
      fontWeight: fontWeight.extrabold,
      letterSpacing: letterSpacing.h1,
      color: theme.text,
      marginBottom: space[2],
    },
    /** Mock: fontSize 32, weight 800, letterSpacing -0.04em, lineHeight 1.2. */
    headline: {
      fontFamily,
      fontSize: fontSize.h1,
      fontWeight: fontWeight.extrabold,
      letterSpacing: letterSpacing.h1,
      color: theme.text,
      lineHeight: fontSize.h1 * 1.2,
    },
    /** Mock: fontSize 15, color text3, weight 500, lineHeight 1.5. */
    subDescription: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      color: theme.text3,
      lineHeight: fontSize.body * 1.5,
    },
    alreadyLoggedIn: {
      fontFamily,
      fontSize: fontSize.body,
      color: theme.text2,
      textAlign: 'center',
    },
    heroButton: {
      alignSelf: 'stretch',
      marginTop: space[4],
    },
    /** Mock 하단 CTA gap 10 + 약관 marginTop 12 ≒ space[3]. */
    ctaBlock: {
      gap: space[3],
    },
    /** Mock: fontSize 12, color text3, textAlign center, lineHeight 1.5. */
    termsNotice: {
      fontFamily,
      fontSize: fontSize.caption,
      color: theme.text3,
      textAlign: 'center',
      lineHeight: fontSize.caption * 1.5,
      marginTop: space[2],
    },
    noticeCard: {
      backgroundColor: theme.subtle,
      borderRadius: radius.lg,
      padding: space[4],
      gap: space[1],
    },
    noticeTitle: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    noticeBody: {
      fontFamily,
      fontSize: fontSize.caption,
      color: theme.text2,
    },
    errorCard: {
      backgroundColor: withAlpha(theme.semantic.danger, 0.08),
      borderRadius: radius.lg,
      padding: space[4],
      gap: space[1],
    },
    errorTitle: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
    },
    errorBody: {
      fontFamily,
      fontSize: fontSize.caption,
      color: theme.text2, // I3: HomeScreen errorBox 와 일관 (muted body)
    },
    devSection: {
      gap: space[3],
    },
    devToggle: {
      paddingVertical: space[3],
      alignSelf: 'flex-start',
    },
    devTogglePressed: {
      opacity: 0.7,
    },
    devToggleLabel: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    devPanel: {
      backgroundColor: theme.subtle,
      borderRadius: radius.lg,
      padding: space[4],
      gap: space[2],
    },
    devHint: {
      fontFamily,
      fontSize: fontSize.caption,
      color: theme.text3,
    },
    devLabel: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: theme.text2,
      marginTop: space[2],
    },
    devInput: {
      backgroundColor: theme.bg,
      borderColor: theme.hairline,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: space[3],
      minHeight: 96,
      color: theme.text,
      fontFamily,
      fontSize: fontSize.caption,
      textAlignVertical: 'top',
    },
    devSubmit: {
      marginTop: space[2],
    },
  });
}
