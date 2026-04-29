import React, { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AuthHydrationGate } from '@/components/common/screen/AuthHydrationGate';
import { LoginAlreadySignedInView } from '@/components/auth/login/LoginAlreadySignedInView';
import { LoginFormView } from '@/components/auth/login/LoginFormView';
import { makeLoginStyles } from '@/components/auth/login/loginStyles';
import { useLoginScreen } from '@/hooks/screens/useLoginScreen';
import { useTokens } from '@/lib/useTokens';
import type { RootStackParamList } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

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
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);
  const styles = useMemo(() => makeLoginStyles(theme), [theme]);
  const login = useLoginScreen(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  });

  return (
    <AuthHydrationGate
      hydrated={hydrated}
      accessToken={accessToken}
      loginTitleKey="profile.loginRequiredTitle"
      loginDescriptionKey="profile.loginRequiredDescription"
      renderWhenGuest={() => (
        <LoginFormView
          styles={styles}
          theme={theme}
          isKakaoLinked={login.isKakaoLinked}
          isPending={login.isPending}
          errorMessage={login.errorMessage}
          devOpen={login.devOpen}
          devToken={login.devToken}
          setDevOpen={login.setDevOpen}
          setDevToken={login.setDevToken}
          onDevSubmit={login.onDevSubmit}
          onKakaoPress={login.onKakaoPress}
        />
      )}
    >
      {() => (
        <LoginAlreadySignedInView
          styles={styles}
          onGoHome={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
        />
      )}
    </AuthHydrationGate>
  );
}
