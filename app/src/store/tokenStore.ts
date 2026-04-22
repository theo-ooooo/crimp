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
 * 교체 시 `setTokenStorage(new KeychainTokenStorage())` 한 줄로 마이그레이션.
 */
let activeStorage: SecureTokenStorage = new InMemoryTokenStorage();

export function setTokenStorage(storage: SecureTokenStorage): void {
  activeStorage = storage;
}

export function getTokenStorage(): SecureTokenStorage {
  return activeStorage;
}

/**
 * UI 가 구독하는 Zustand 스토어.
 *
 * - `accessToken` 은 반응형 UI 상태
 * - `hydrate()` 는 앱 부팅 시 1회 호출해 `SecureTokenStorage` → 상태로 로드
 * - `setAccessToken()` / `clear()` 는 스토리지와 상태를 동시에 갱신
 */
export interface TokenState {
  accessToken: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setAccessToken: (token: string | null) => Promise<void>;
  clear: () => Promise<void>;
}

export const useTokenStore = create<TokenState>((set) => ({
  accessToken: null,
  hydrated: false,
  hydrate: async () => {
    const token = await getTokenStorage().get();
    set({ accessToken: token, hydrated: true });
  },
  setAccessToken: async (token) => {
    const storage = getTokenStorage();
    if (token === null) {
      await storage.remove();
    } else {
      await storage.set(token);
    }
    set({ accessToken: token });
  },
  clear: async () => {
    await getTokenStorage().remove();
    set({ accessToken: null });
  },
}));
