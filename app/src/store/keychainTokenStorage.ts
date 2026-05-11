import * as Keychain from 'react-native-keychain';

import type { SecureTokenStorage } from './tokenStore';

const ACCESS_SERVICE = 'run.crimp.auth.access-token';
const REFRESH_SERVICE = 'run.crimp.auth.refresh-token';
const TOKEN_USERNAME = 'crimp-token';

type TokenSlot = 'access' | 'refresh';

export class KeychainTokenStorage implements SecureTokenStorage {
  private readonly service: string;

  constructor(slot: TokenSlot) {
    this.service = slot === 'access' ? ACCESS_SERVICE : REFRESH_SERVICE;
  }

  async get(): Promise<string | null> {
    const credentials = await Keychain.getGenericPassword({
      service: this.service,
    });
    if (!credentials) {
      return null;
    }
    return credentials.password;
  }

  async set(token: string): Promise<void> {
    await Keychain.setGenericPassword(TOKEN_USERNAME, token, {
      service: this.service,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  async remove(): Promise<void> {
    await Keychain.resetGenericPassword({
      service: this.service,
    });
  }
}

export function createDefaultTokenStorages(): {
  access: SecureTokenStorage;
  refresh: SecureTokenStorage;
} {
  return {
    access: new KeychainTokenStorage('access'),
    refresh: new KeychainTokenStorage('refresh'),
  };
}
