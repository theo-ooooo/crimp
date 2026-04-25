'use client';

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';

/**
 * 임시 개발용 토큰 스토어.
 *
 * TODO: 실제 프로덕션 배포 전에 아래 이슈를 해결해야 한다.
 *   1. Access/refresh token 을 `localStorage` 에 평문 저장하는 것은 XSS 에 취약하다.
 *   2. refresh token 회전·쿠키(HttpOnly) 기반 방식으로 교체할 예정.
 *   3. 현재 구현은 로컬 개발 편의용으로만 사용한다.
 *
 * 구현 메모:
 * - SSR 환경에서는 `window`/`localStorage` 접근이 불가능하므로 hydration 전에는
 *   항상 `null` 을 반환한다. 클라이언트 마운트 이후 `hydrate()` 호출이 필요하다.
 * - access · refresh 토큰은 항상 함께 저장/삭제한다 (`setTokens` / `clear`).
 *   `setAccessToken` 은 단독 갱신 (refresh 회전 응답 등) 시 사용.
 */
const ACCESS_KEY = 'crimp.accessToken';
const REFRESH_KEY = 'crimp.refreshToken';

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

function readKey(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // storage quota / disabled storage 등은 무시.
  }
}

export const useTokenStore = create<TokenState>((set) => ({
  accessToken: null,
  refreshToken: null,
  hydrated: false,
  hydrate: () => {
    const access = readKey(ACCESS_KEY);
    const refresh = readKey(REFRESH_KEY);
    set({ accessToken: access, refreshToken: refresh, hydrated: true });
  },
  setAccessToken: (token) => {
    writeKey(ACCESS_KEY, token);
    set({ accessToken: token });
  },
  setTokens: ({ accessToken, refreshToken }) => {
    writeKey(ACCESS_KEY, accessToken);
    writeKey(REFRESH_KEY, refreshToken);
    set({ accessToken, refreshToken });
  },
  clear: () => {
    writeKey(ACCESS_KEY, null);
    writeKey(REFRESH_KEY, null);
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
