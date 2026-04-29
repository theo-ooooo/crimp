import { useState } from 'react';

import { useExchangeOauth } from '@/hooks/queries/useAuth';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';

type KakaoTokenLike = { idToken?: string | null; accessToken?: string | null };
type KakaoLoginFn = (nonce?: string | null) => Promise<KakaoTokenLike>;

let kakaoLogin: KakaoLoginFn | null = null;
try {
  const mod: { login?: KakaoLoginFn } = require('@react-native-seoul/kakao-login');
  kakaoLogin = typeof mod.login === 'function' ? mod.login : null;
} catch {
  kakaoLogin = null;
}

function generateKakaoNonce(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 16; i += 1) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

export function useLoginScreen(onLoggedIn: () => void) {
  const exchange = useExchangeOauth();
  const [devOpen, setDevOpen] = useState(false);
  const [devToken, setDevToken] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submitIdToken = async (idToken: string) => {
    setErrorMessage(null);
    try {
      await exchange.mutateAsync({ provider: 'kakao', idToken });
      setDevToken('');
      setDevOpen(false);
      onLoggedIn();
    } catch (err) {
      setErrorMessage(toUserMessage(err));
    }
  };

  const onKakaoPress = async () => {
    if (!kakaoLogin) {
      setDevOpen(true);
      setErrorMessage(t('auth.login.kakaoUnavailable'));
      return;
    }
    setErrorMessage(null);
    try {
      const result = await kakaoLogin(generateKakaoNonce());
      const idToken = result?.idToken;
      if (!idToken) {
        setErrorMessage(t('auth.login.kakaoNoIdToken'));
        return;
      }
      await submitIdToken(idToken);
    } catch (err) {
      setErrorMessage(toUserMessage(err));
    }
  };

  const onDevSubmit = async () => {
    const trimmed = devToken.trim();
    if (trimmed.length === 0) {
      return;
    }
    await submitIdToken(trimmed);
  };

  return {
    devOpen,
    setDevOpen,
    devToken,
    setDevToken,
    errorMessage,
    onKakaoPress,
    onDevSubmit,
    isPending: exchange.isPending,
    isKakaoLinked: kakaoLogin !== null,
  };
}
