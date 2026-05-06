'use client';

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';

/**
 * 웹 인증 상태 스토어.
 *
 * 백엔드는 로그인/refresh 응답에 HttpOnly access/refresh 쿠키를 함께 발행한다.
 * 웹은 토큰을 localStorage/sessionStorage 에 저장하지 않고, 현재 탭에서 받은 access
 * token 만 메모리에 보관한다. refresh token 은 JS 에 보관하지 않고 HttpOnly 쿠키
 * fallback 만 사용한다.
 */
export const COOKIE_AUTH_ACCESS_TOKEN = '__crimp_cookie_auth__';

export function isCookieAuthAccessToken(token: string | null | undefined): boolean {
  return token === COOKIE_AUTH_ACCESS_TOKEN;
}

const LEGACY_ACCESS_KEY = 'crimp.accessToken';
const LEGACY_REFRESH_KEY = 'crimp.refreshToken';

export interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
  cookieAuthCandidate: boolean;
  hydrated: boolean;
  hydrate: () => void;
  setAccessToken: (token: string | null) => void;
  /**
   * 로그인·refresh 응답 후 access token 만 메모리에 둔다.
   * refresh token 은 백엔드가 발행한 HttpOnly 쿠키만 사용한다.
   */
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  markCookieAuthenticated: () => void;
  clear: () => void;
}

function clearLegacyPlaintextTokens(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LEGACY_ACCESS_KEY);
    window.localStorage.removeItem(LEGACY_REFRESH_KEY);
  } catch {
    // storage disabled 환경에서는 쿠키 인증만 계속 진행한다.
  }
}

export const useTokenStore = create<TokenState>((set) => ({
  accessToken: null,
  refreshToken: null,
  cookieAuthCandidate: false,
  hydrated: false,
  hydrate: () => {
    clearLegacyPlaintextTokens();
    set({
      accessToken: null,
      refreshToken: null,
      cookieAuthCandidate: true,
      hydrated: true,
    });
  },
  setAccessToken: (token) => {
    set({ accessToken: token, cookieAuthCandidate: false });
  },
  setTokens: ({ accessToken }) => {
    set({ accessToken, refreshToken: null, cookieAuthCandidate: false });
  },
  markCookieAuthenticated: () => {
    set({
      accessToken: COOKIE_AUTH_ACCESS_TOKEN,
      refreshToken: null,
      cookieAuthCandidate: false,
    });
  },
  clear: () => {
    set({ accessToken: null, refreshToken: null, cookieAuthCandidate: false });
  },
}));

/**
 * SSR 친화적인 hydration-safe selector.
 * 서버 렌더링 단계에서는 항상 `null` 을 반환해 hydration mismatch 를 방지한다.
 */
export function useAccessToken(): string | null {
  const subscribe = useTokenStore.subscribe;
  const getSnapshot = () => useTokenStore.getState().accessToken;
  const getServerSnapshot = () => null;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * SSR 친화적인 refresh 토큰 selector.
 */
export function useRefreshToken(): string | null {
  const subscribe = useTokenStore.subscribe;
  const getSnapshot = () => useTokenStore.getState().refreshToken;
  const getServerSnapshot = () => null;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useCookieAuthCandidate(): boolean {
  const subscribe = useTokenStore.subscribe;
  const getSnapshot = () => useTokenStore.getState().cookieAuthCandidate;
  const getServerSnapshot = () => false;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
