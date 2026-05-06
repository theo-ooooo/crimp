'use client';

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';

/**
 * 웹 인증 상태 스토어.
 *
 * 백엔드는 로그인/refresh 응답에 HttpOnly access/refresh 쿠키를 함께 발행한다.
 * 웹은 토큰을 localStorage/sessionStorage 에 저장하지 않고, 현재 탭에서 받은 access
 * token 만 메모리에 보관한다. 새로고침 이후에는 HttpOnly 쿠키만 남기 때문에
 * `hydrate()` 가 쿠키 인증 시도용 sentinel 을 넣어 보호 쿼리를 실행시킨다.
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
  hydrated: boolean;
  hydrate: () => void;
  setAccessToken: (token: string | null) => void;
  /**
   * access·refresh 를 한 번에 저장 (로그인·refresh 응답 후 호출).
   * 단독 setter (`setRefreshToken`) 는 의도적으로 노출하지 않는다 —
   * refresh 토큰만 갱신되는 정상 흐름이 없어 access 와 분리해 저장하면 일관성 깨짐.
   */
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
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
  hydrated: false,
  hydrate: () => {
    clearLegacyPlaintextTokens();
    set({
      accessToken: COOKIE_AUTH_ACCESS_TOKEN,
      refreshToken: null,
      hydrated: true,
    });
  },
  setAccessToken: (token) => {
    set({ accessToken: token });
  },
  setTokens: ({ accessToken, refreshToken }) => {
    set({ accessToken, refreshToken });
  },
  clear: () => {
    set({ accessToken: null, refreshToken: null });
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
