import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useMeQuery } from './src/hooks/useMe';
import { t } from './src/lib/i18n';
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
 * 인증/온보딩 상태에 따라 RootStack 분기를 결정한다.
 *
 * - accessToken === null → LoginStack
 * - accessToken 있음 + me 로딩 중 → HydrationGate (스플래시 재사용)
 * - accessToken 있음 + me.mainGym === null + 게이트 dismiss 안 한 상태 → OnboardingGymScreen 단독
 * - 그 외 → MainTabs
 *
 * QueryClientProvider 하위에서 `useMeQuery` 를 호출해야 하므로 별도 컴포넌트로 분리.
 */
function AppRouter({ accessToken }: { accessToken: string | null }): JSX.Element {
  const meQuery = useMeQuery(accessToken);
  const onboardingDismissed = useOnboardingStore(
    (s) => s.dismissedThisSession,
  );

  const me = meQuery.data;
  const needsOnboarding =
    accessToken !== null &&
    me !== undefined &&
    me.mainGym == null &&
    !onboardingDismissed;
  const meIsLoading = accessToken !== null && meQuery.isLoading;

  return (
    <RootStack.Navigator>
      {accessToken === null ? (
        <>
          <RootStack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: t('auth.login.title') }}
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
      ) : meIsLoading ? (
        // me 로딩 동안은 깜빡임 없이 스플래시 — 토큰 hydrate 직후와 동일 UX.
        <RootStack.Screen
          name="Login"
          component={HydrationGateScreen}
          options={{ headerShown: false }}
        />
      ) : needsOnboarding ? (
        <RootStack.Screen
          name="OnboardingGym"
          component={OnboardingGymScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
      ) : (
        <>
          {/*
           * 인증 + 온보딩 통과 진입 컨테이너. `Home` 이름은 RootStackParamList 호환을
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
  );
}

/** Stack screen 형태로 사용하기 위한 HydrationGate 래퍼. */
function HydrationGateScreen(): JSX.Element {
  return <HydrationGate />;
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateLabel: {
    fontFamily,
    fontSize: fontSize.body,
  },
});
