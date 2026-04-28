'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { exchangeOauth, exchangeOauthCode, logout as logoutRequest } from '@/lib/api';
import { onboardingDismiss } from '@/lib/auth/onboardingDismiss';
import type { OauthProvider, TokenResponse } from '@/lib/schemas/auth';
import { useTokenStore } from '@/store/tokenStore';

/**
 * 인증 관련 React Query 뮤테이션 훅.
 *
 * 디자인 노트:
 *  - 성공 시 access·refresh 토큰을 함께 저장 (`setTokens`).
 *  - 로그아웃 시 서버 호출 → 로컬 토큰 즉시 삭제 → React Query 캐시 무효화.
 *    네트워크 실패해도 로컬 토큰은 정리한다 (만료된 refresh 도 동일 흐름).
 *  - 화면 이동(`router.push`) 은 호출부에서 처리. 훅은 상태만 책임진다.
 */

export interface ExchangeOauthVars {
  provider: OauthProvider;
  idToken: string;
}

export function useExchangeOauth() {
  const setTokens = useTokenStore((s) => s.setTokens);
  return useMutation<TokenResponse, Error, ExchangeOauthVars>({
    mutationFn: ({ provider, idToken }) => exchangeOauth(provider, idToken),
    onSuccess: (tokens) => {
      setTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    },
  });
}

export interface ExchangeOauthCodeVars {
  provider: OauthProvider;
  code: string;
  redirectUri: string;
}

/**
 * 웹 v2 redirect flow 전용 — `?code=` 를 백엔드 JWT 로 교환.
 *
 * 카카오 JS SDK v2.x 부터 popup 기반 `Auth.login` 이 제거되었기 때문에 웹은
 * `Auth.authorize` 로 redirect → callback 페이지에서 `code` 추출 → 본 뮤테이션 호출
 * 의 흐름을 사용한다. 결과는 기존 `useExchangeOauth` 와 동일한 토큰 쌍.
 */
export function useExchangeOauthCode() {
  const setTokens = useTokenStore((s) => s.setTokens);
  return useMutation<TokenResponse, Error, ExchangeOauthCodeVars>({
    mutationFn: ({ provider, code, redirectUri }) =>
      exchangeOauthCode(provider, code, redirectUri),
    onSuccess: (tokens) => {
      setTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    },
  });
}

/**
 * 로그아웃 뮤테이션.
 *
 * - 입력 없음. 스토어의 refresh 토큰을 사용.
 * - refresh 가 없으면 서버 호출 없이 로컬만 정리.
 * - 서버 응답 실패해도 `onSettled` 에서 토큰 정리·캐시 무효화.
 */
export function useLogout() {
  const qc = useQueryClient();
  const clear = useTokenStore((s) => s.clear);
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const refresh = useTokenStore.getState().refreshToken;
      if (!refresh) return;
      await logoutRequest(refresh);
    },
    onSettled: () => {
      clear();
      // 다음 계정 진입을 깨끗하게 — mainGym 온보딩 dismiss 도 같이 초기화.
      onboardingDismiss.clear();
      qc.clear();
    },
  });
}
