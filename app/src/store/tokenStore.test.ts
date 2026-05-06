import * as Keychain from 'react-native-keychain';

import { useTokenStore } from './tokenStore';

const resetKeychainMock = (Keychain as unknown as {
  __resetKeychainMock: () => void;
}).__resetKeychainMock;

describe('useTokenStore', () => {
  beforeEach(async () => {
    resetKeychainMock();
    useTokenStore.setState({
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      hydrated: false,
    });
  });

  it('persists tokens in secure storage and hydrates them back', async () => {
    await useTokenStore.getState().setTokens({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 60,
    });

    useTokenStore.setState({
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      hydrated: false,
    });

    await useTokenStore.getState().hydrate();

    expect(useTokenStore.getState().accessToken).toBe('access-token');
    expect(useTokenStore.getState().refreshToken).toBe('refresh-token');
    expect(useTokenStore.getState().hydrated).toBe(true);
  });

  it('clears both secure token slots', async () => {
    await useTokenStore.getState().setTokens({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    await useTokenStore.getState().clear();
    await useTokenStore.getState().hydrate();

    expect(useTokenStore.getState().accessToken).toBeNull();
    expect(useTokenStore.getState().refreshToken).toBeNull();
  });
});
