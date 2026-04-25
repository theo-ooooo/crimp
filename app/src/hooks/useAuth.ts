import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

import { exchangeOauth, logout as logoutEndpoint } from '@/lib/api';
import type { OauthProvider, TokenResponse } from '@/lib/schemas/auth';
import type { RootStackParamList } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

/**
 * 인증 훅 묶음.
 *
 * - `useExchangeOauth()` — `{ provider, idToken }` 으로 백엔드와 토큰 교환 후 store 에 저장
 * - `useLogout()` — refresh 토큰을 백엔드 블랙리스트에 등록한 뒤 store 를 비우고 로그인 화면으로 이동
 *
 * Phase 1 한계 (tokenStore.ts 참조): storage 가 InMemory 이므로 앱 재시작 시
 * 두 토큰 모두 유실된다. 따라서 refresh rotation 은 같은 세션 내에서만 동작.
 */

export type ExchangeOauthVars = {
  provider: OauthProvider;
  idToken: string;
};

/**
 * OAuth idToken → Crimp 토큰 교환 mutation.
 *
 * 성공 시:
 *  - tokenStore 에 access/refresh 동시 저장
 *  - 로그인 직전 캐시(이전 사용자의 me/sessions 등)는 새 토큰으로 자동 재요청 되어야 하므로
 *    'me' 쿼리만 명시적으로 무효화한다 (sessions 등은 enabled 가 토큰에 의해 다시 켜질 때
 *    refetch 되는 구조).
 */
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

/**
 * 로그아웃 훅.
 *
 * - refresh 토큰이 있으면 백엔드 블랙리스트 등록을 시도. 네트워크 실패는 silent 로 무시
 *   (사용자 입장에서 "로그아웃" 은 항상 성공해야 하므로 클라이언트 상태 정리를 우선).
 * - 그 후 store clear → React Query 캐시 비움 → Login 화면으로 reset.
 */
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
    qc.clear();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }, [refreshToken, clear, qc, navigation]);
}
