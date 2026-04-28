import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useMeQuery } from './src/hooks/useMe';
import { t } from './src/lib/i18n';
import { shouldShowOnboardingGate } from './src/lib/onboardingGate';
import { fontFamily, fontSize } from './src/lib/tokens';
import { useTokens } from './src/lib/useTokens';
import MainTabs from './src/navigation/MainTabs';
import type { RootStackParamList } from './src/navigation/types';
import DesignPrimitivesScreen from './src/screens/DesignPrimitivesScreen';
import LoginScreen from './src/screens/LoginScreen';
import OnboardingGymScreen from './src/screens/OnboardingGymScreen';
import { useOnboardingStore } from './src/store/onboardingStore';
import { useTokenStore } from './src/store/tokenStore';

// 앱 루트에서 1회 생성해 Fast Refresh 간에도 보존.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const RootStack = createNativeStackNavigator<RootStackParamList>();

/**
 * 토큰 hydrate 가 끝날 때까지 잠깐 보여주는 스플래시 폴백.
 * Phase 1 인-메모리 스토리지에서는 즉시 끝나지만, Keychain 도입 후에도 안전하게 작동한다.
 */
function HydrationGate(): JSX.Element {
  const theme = useTokens();
  return (
    <View style={[styles.gate, { backgroundColor: theme.bg }]}>
      <Text style={[styles.gateLabel, { color: theme.text3 }]}>
        {t('common.loading')}
      </Text>
    </View>
  );
}

export default function App(): JSX.Element {
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);

  useEffect(() => {
    // SecureStore 교체 전까지는 인-메모리 스토리지를 hydrate 한다 (TODO: 후속 PR).
    useTokenStore
      .getState()
      .hydrate()
      .catch(() => {
        /* 초기 hydrate 실패는 무시 — 후속 PR 에서 로깅 연결 */
      });
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          {!hydrated ? (
            <HydrationGate />
          ) : (
            <AppRouter accessToken={accessToken} />
          )}
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * 인증 상태별 RootStack + MainGym 온보딩 게이트 오버레이.
 *
 * RootStack 의 screen 등록 집합은 `accessToken` 변화에만 좌우된다 (LoginStack ↔
 * 인증 후 컨테이너). OnboardingGym 은 별도 screen 으로 등록하지 않고, 인증된
 * RootStack 위에 absolute position 으로 덮는다 — 이렇게 하면 LoginScreen 의
 * `navigation.reset({Home})` 이나 HomeScreen 의 `navigation.navigate('SessionList')`
 * 같은 기존 호출이 게이트 표시 중에도 유효한 navigator 를 찾는다 (등록된 screen 이
 * 사라지지 않음). 이전 시도에서 RootStack 분기로 OnboardingGym 만 등록했다가
 * "RESET to Home not handled" / "NAVIGATE to SessionList not handled" 런타임 에러가
 * 발생해 오버레이 방식으로 수정.
 *
 * me 로딩 중에는 게이트를 띄우지 않는다 — 미설정 상태가 확정된 뒤(`me.mainGym == null`)
 * 에만 노출. 따라서 me 도착 직전 짧게 MainTabs 가 보일 수 있으나, 각 화면이 자체
 * 로딩 상태를 가지므로 UX 상 무리 없음.
 */
function AppRouter({ accessToken }: { accessToken: string | null }): JSX.Element {
  const meQuery = useMeQuery(accessToken);
  const onboardingDismissed = useOnboardingStore(
    (s) => s.dismissedThisSession,
  );

  const needsOnboarding = shouldShowOnboardingGate({
    accessToken,
    me: meQuery.data,
    onboardingDismissed,
  });

  return (
    <View style={styles.fill}>
      <RootStack.Navigator>
        {accessToken === null ? (
          <>
            <RootStack.Screen
              name="Login"
              component={LoginScreen}
              // 풀스크린 진입 화면이라 헤더 숨김 — RootStack 의 기본 native-stack
              // 헤더가 iOS/Android 시각이 어긋나는 이슈도 함께 회피.
              options={{ title: t('auth.login.title'), headerShown: false }}
            />
            {/*
             * DesignPrimitives 는 dev 전용 deep-link 대상. 비인증 상태에서도
             * 접근 가능해야 디자인 토큰 점검이 가능하다 (PR #68 회귀 fix).
             */}
            <RootStack.Screen
              name="DesignPrimitives"
              component={DesignPrimitivesScreen}
              options={{ title: 'Design Primitives' }}
            />
          </>
        ) : (
          <>
            {/*
             * 인증 상태의 진입 컨테이너. `Home` 이름은 RootStackParamList 호환을
             * 위해 유지하고, 컴포넌트로는 BottomTabs 컨테이너를 매핑한다.
             * MainTabs 내부에 자체 헤더 (각 탭 inner Stack 의 헤더) 가 그려지므로
             * 외부 RootStack 헤더는 숨긴다.
             */}
            <RootStack.Screen
              name="Home"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <RootStack.Screen
              name="DesignPrimitives"
              component={DesignPrimitivesScreen}
              options={{ title: 'Design Primitives' }}
            />
          </>
        )}
      </RootStack.Navigator>

      {needsOnboarding ? (
        <View
          style={styles.onboardingOverlay}
          pointerEvents="auto"
          accessibilityViewIsModal
        >
          <OnboardingGymScreen />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateLabel: {
    fontFamily,
    fontSize: fontSize.body,
  },
  onboardingOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
