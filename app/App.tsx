import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { t } from './src/lib/i18n';
import type { RootStackParamList } from './src/navigation/types';
import DesignPrimitivesScreen from './src/screens/DesignPrimitivesScreen';
import GymDetailScreen from './src/screens/GymDetailScreen';
import GymSearchScreen from './src/screens/GymSearchScreen';
import HomeScreen from './src/screens/HomeScreen';
import SessionDetailScreen from './src/screens/SessionDetailScreen';
import SessionListScreen from './src/screens/SessionListScreen';
import StartSessionScreen from './src/screens/StartSessionScreen';
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

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App(): JSX.Element {
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
          <Stack.Navigator>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: 'Crimp' }}
            />
            <Stack.Screen
              name="SessionList"
              component={SessionListScreen}
              options={{ title: t('session.list.title') }}
            />
            <Stack.Screen
              name="StartSession"
              component={StartSessionScreen}
              options={{ title: t('session.start.title') }}
            />
            <Stack.Screen
              name="SessionDetail"
              component={SessionDetailScreen}
              options={{ title: t('session.detail.title') }}
            />
            <Stack.Screen
              name="GymSearch"
              component={GymSearchScreen}
              options={{ title: t('gym.list.title') }}
            />
            <Stack.Screen
              name="GymDetail"
              component={GymDetailScreen}
              options={{ title: t('gym.detail.title') }}
            />
            <Stack.Screen
              name="DesignPrimitives"
              component={DesignPrimitivesScreen}
              options={{ title: 'Design Primitives' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
