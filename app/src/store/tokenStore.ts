import { create } from 'zustand';

import { createDefaultTokenStorages } from './keychainTokenStorage';

/**
 * 보안 토큰 저장소 추상화 인터페이스.
 *
 * 기본 구현은 `react-native-keychain` 이며 iOS Keychain / Android Keystore 기반으로
 * 저장한다. 테스트나 특수 환경에서는 `setTokenStorage(...)` 로 교체할 수 있다.
 *
 * access 토큰과 refresh 토큰은 동일 인터페이스로 관리한다 (서로 다른 키 슬롯).
 */
export interface SecureTokenStorage {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  remove(): Promise<void>;
}

/**
 * 인-메모리 기본 구현. 플랫폼 SecureStore 로 교체 예정.
 */
export class InMemoryTokenStorage implements SecureTokenStorage {
  private value: string | null = null;

  async get(): Promise<string | null> {
    return this.value;
  }

  async set(token: string): Promise<void> {
    this.value = token;
  }

  async remove(): Promise<void> {
    this.value = null;
  }
}

const defaultStorages = createDefaultTokenStorages();

let activeAccessStorage: SecureTokenStorage = defaultStorages.access;
let activeRefreshStorage: SecureTokenStorage = defaultStorages.refresh;

export function setTokenStorage(
  accessStorage: SecureTokenStorage,
  refreshStorage?: SecureTokenStorage,
): void {
  activeAccessStorage = accessStorage;
  if (refreshStorage) {
    activeRefreshStorage = refreshStorage;
  }
}

export function getTokenStorage(): SecureTokenStorage {
  return activeAccessStorage;
}

export function getRefreshTokenStorage(): SecureTokenStorage {
  return activeRefreshStorage;
}

/**
 * UI 가 구독하는 Zustand 스토어.
 *
 * - `accessToken` / `refreshToken` 은 반응형 UI 상태
 * - `hydrate()` 는 앱 부팅 시 1회 호출해 storage → 상태로 로드
 * - `setTokens()` 는 두 토큰을 원자적으로 갱신 (로그인/리프레시 응답 후)
 * - `setAccessToken()` / `setRefreshToken()` 은 단일 토큰만 갱신할 때
 * - `clear()` 는 두 토큰을 모두 비운다 (로그아웃)
 *
 */
export interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
  /**
   * accessToken 만료 epoch ms (`Date.now() + expiresIn * 1000`).
   * 401 인터셉터가 proactive refresh 를 트리거할 때 참조 (Phase 2).
   * 메모리 한정 — 앱 재시작 시 유실, 토큰만 storage 에 보존된다.
   */
  accessTokenExpiresAt: number | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setAccessToken: (token: string | null) => Promise<void>;
  setRefreshToken: (token: string | null) => Promise<void>;
  setTokens: (tokens: {
    accessToken: string;
    refreshToken: string;
    /** access TTL (초). 백엔드 `TokenResponse.expiresIn`. */
    expiresIn?: number;
  }) => Promise<void>;
  clear: () => Promise<void>;
}

export const useTokenStore = create<TokenState>((set) => ({
  accessToken: null,
  refreshToken: null,
  accessTokenExpiresAt: null,
  hydrated: false,
  hydrate: async () => {
    const [access, refresh] = await Promise.all([
      activeAccessStorage.get(),
      activeRefreshStorage.get(),
    ]);
    set({ accessToken: access, refreshToken: refresh, hydrated: true });
  },
  setAccessToken: async (token) => {
    if (token === null) {
      await activeAccessStorage.remove();
    } else {
      await activeAccessStorage.set(token);
    }
    set({ accessToken: token });
  },
  setRefreshToken: async (token) => {
    if (token === null) {
      await activeRefreshStorage.remove();
    } else {
      await activeRefreshStorage.set(token);
    }
    set({ refreshToken: token });
  },
  setTokens: async ({ accessToken, refreshToken, expiresIn }) => {
    await Promise.all([
      activeAccessStorage.set(accessToken),
      activeRefreshStorage.set(refreshToken),
    ]);
    const accessTokenExpiresAt =
      typeof expiresIn === 'number' ? Date.now() + expiresIn * 1000 : null;
    set({ accessToken, refreshToken, accessTokenExpiresAt });
  },
  clear: async () => {
    await Promise.all([
      activeAccessStorage.remove(),
      activeRefreshStorage.remove(),
    ]);
    set({ accessToken: null, refreshToken: null, accessTokenExpiresAt: null });
  },
}));
