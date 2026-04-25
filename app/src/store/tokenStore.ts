import { create } from 'zustand';

/**
 * 보안 토큰 저장소 추상화 인터페이스.
 *
 * TODO (후속 PR): 실제 구현은 iOS Keychain / Android Keystore 기반으로 교체한다.
 *   - `expo-secure-store` 또는 `react-native-keychain` 선정
 *   - async API 로 확장 (현재는 동기)
 *   - 토큰 재발급 (refresh rotation) 흐름과 연결
 *
 * 현재 스켈레톤은 **메모리 전용**이다. 앱 재시작 시 유실된다.
 * 이는 의도된 Phase 1 최소 구현이며, 평문 AsyncStorage 저장은 하지 않는다.
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

/**
 * 싱글톤 스토리지 — DI 지점.
 * 교체 시 `setTokenStorage(new KeychainTokenStorage(), new KeychainTokenStorage())` 한 줄로 마이그레이션.
 *
 * NOTE: 현재 InMemory 구현은 인스턴스 단위로 값을 들고 있으므로, access/refresh 를
 *       각각 별개의 storage 인스턴스에 둔다. Keychain 도입 시 단일 storage + key prefix
 *       구조로 전환해도 외부 API 는 동일하게 유지될 것.
 */
let activeAccessStorage: SecureTokenStorage = new InMemoryTokenStorage();
let activeRefreshStorage: SecureTokenStorage = new InMemoryTokenStorage();

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
 * Phase 1 한계: storage 가 InMemory 이므로 앱 재시작 시 토큰이 유실된다.
 * 사용자는 매 부팅마다 다시 로그인해야 한다. Phase 2 에서 Keychain/Keystore 로 교체.
 */
export interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setAccessToken: (token: string | null) => Promise<void>;
  setRefreshToken: (token: string | null) => Promise<void>;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
  clear: () => Promise<void>;
}

export const useTokenStore = create<TokenState>((set) => ({
  accessToken: null,
  refreshToken: null,
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
  setTokens: async ({ accessToken, refreshToken }) => {
    await Promise.all([
      activeAccessStorage.set(accessToken),
      activeRefreshStorage.set(refreshToken),
    ]);
    set({ accessToken, refreshToken });
  },
  clear: async () => {
    await Promise.all([
      activeAccessStorage.remove(),
      activeRefreshStorage.remove(),
    ]);
    set({ accessToken: null, refreshToken: null });
  },
}));
