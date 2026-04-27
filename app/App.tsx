import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { t } from './src/lib/i18n';
import { fontFamily, fontSize } from './src/lib/tokens';
import { useTokens } from './src/lib/useTokens';
import MainTabs from './src/navigation/MainTabs';
import type { RootStackParamList } from './src/navigation/types';
import DesignPrimitivesScreen from './src/screens/DesignPrimitivesScreen';
import LoginScreen from './src/screens/LoginScreen';
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
            // 단일 RootStack 내부에서 인증 상태에 따라 자식 화면을 분기한다.
            // 이 패턴은 React Navigation Auth Flow 표준 가이드와 동일하며,
            // accessToken 변화 시 LoginStack ↔ MainTabs 전환을 React Navigation 이
            // 자동 애니메이트한다 (별도 navigation.reset 호출 없이도 동작).
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
          )}
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
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
