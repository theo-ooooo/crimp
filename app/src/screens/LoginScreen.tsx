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
type KakaoLoginFn = () => Promise<KakaoTokenLike>;

let kakaoLogin: KakaoLoginFn | null = null;
try {
  const mod: { login?: KakaoLoginFn } = require('@react-native-seoul/kakao-login');
  kakaoLogin = typeof mod.login === 'function' ? mod.login : null;
} catch {
  kakaoLogin = null;
}

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
      const result = await kakaoLogin();
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
      <View style={styles.heroBlock}>
        <Text style={styles.brand}>{t('common.brand')}</Text>
        <Text style={styles.tagline}>{t('auth.login.tagline')}</Text>
      </View>

      {kakaoLogin === null ? (
        <View style={styles.noticeCard} accessibilityRole="alert">
          <Text style={styles.noticeTitle}>{t('auth.login.nativeUnlinkedTitle')}</Text>
          <Text style={styles.noticeBody}>{t('auth.login.nativeUnlinkedBody')}</Text>
        </View>
      ) : null}

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
      </View>

      {errorMessage ? (
        <View style={styles.errorCard} accessibilityRole="alert">
          <Text style={styles.errorTitle}>{t('auth.login.errorTitle')}</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Dev 모드 폴백 */}
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
    scrollContent: {
      padding: space[5],
      paddingTop: space[10],
      paddingBottom: space[14],
      gap: space[6],
    },
    heroBlock: {
      gap: space[2],
      marginBottom: space[4],
    },
    brand: {
      fontFamily,
      fontSize: fontSize.h1,
      fontWeight: fontWeight.extrabold,
      letterSpacing: letterSpacing.h1,
      color: theme.text,
    },
    tagline: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.medium,
      color: theme.text2,
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
    ctaBlock: {
      gap: space[3],
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
