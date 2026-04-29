import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

import { exchangeOauth, logout as logoutEndpoint } from '@/lib/api';
import type { OauthProvider, TokenResponse } from '@/lib/schemas/auth';
import type { RootStackParamList } from '@/navigation/types';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useTokenStore } from '@/store/tokenStore';

export type ExchangeOauthVars = {
  provider: OauthProvider;
  idToken: string;
};

export function useExchangeOauth() {
  const setTokens = useTokenStore((s) => s.setTokens);
  const qc = useQueryClient();

  return useMutation<TokenResponse, Error, ExchangeOauthVars>({
    mutationFn: ({ provider, idToken }) => exchangeOauth(provider, idToken),
    onSuccess: async (tokens) => {
      await setTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useLogout() {
  const refreshToken = useTokenStore((s) => s.refreshToken);
  const clear = useTokenStore((s) => s.clear);
  const qc = useQueryClient();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return useCallback(async () => {
    if (refreshToken) {
      try {
        await logoutEndpoint(refreshToken);
      } catch {
        /* 네트워크/서버 실패는 무시 — 로컬 상태 정리는 계속 진행 */
      }
    }
    await clear();
    useOnboardingStore.getState().reset();
    qc.clear();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }, [refreshToken, clear, qc, navigation]);
}
