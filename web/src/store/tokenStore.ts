'use client';

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';

/**
 * 임시 개발용 토큰 스토어.
 *
 * TODO: 실제 프로덕션 배포 전에 아래 이슈를 해결해야 한다.
 *   1. Access token 을 `localStorage` 에 평문 저장하는 것은 XSS 에 취약하다.
 *   2. refresh token 회전·쿠키(HttpOnly) 기반 방식으로 교체할 예정.
 *   3. 현재 구현은 로컬 개발 편의용으로만 사용한다.
 *
 * 구현 메모:
 * - SSR 환경에서는 `window`/`localStorage` 접근이 불가능하므로 hydration 전에는
 *   항상 `null` 을 반환한다. 클라이언트 마운트 이후 `hydrate()` 호출이 필요하다.
 */
const STORAGE_KEY = 'crimp.accessToken';

export interface TokenState {
  accessToken: string | null;
  hydrated: boolean;
  hydrate: () => void;
  setAccessToken: (token: string | null) => void;
  clear: () => void;
}

function readFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeToStorage(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, token);
    }
  } catch {
    // storage quota / disabled storage 등은 무시.
  }
}

export const useTokenStore = create<TokenState>((set) => ({
  accessToken: null,
  hydrated: false,
  hydrate: () => {
    const stored = readFromStorage();
    set({ accessToken: stored, hydrated: true });
  },
  setAccessToken: (token) => {
    writeToStorage(token);
    set({ accessToken: token });
  },
  clear: () => {
    writeToStorage(null);
    set({ accessToken: null });
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
