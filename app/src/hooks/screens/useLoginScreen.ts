import { useState } from 'react';
import { Platform } from 'react-native';

import { useExchangeOauth } from '@/hooks/queries/useAuth';
import { toUserMessage } from '@/lib/api/errorMessage';
import { ApiError, ApiSchemaError, ApiTransportError } from '@/lib/api/errors';
import { t } from '@/lib/i18n';
import type { OauthProvider } from '@/lib/schemas/auth';

type KakaoTokenLike = { idToken?: string | null; accessToken?: string | null };
type KakaoLoginFn = (nonce?: string | null) => Promise<KakaoTokenLike>;

let kakaoLogin: KakaoLoginFn | null = null;
try {
  const mod: { login?: KakaoLoginFn } = require('@react-native-seoul/kakao-login');
  kakaoLogin = typeof mod.login === 'function' ? mod.login : null;
} catch {
  kakaoLogin = null;
}

/**
 * Apple Sign In 모듈 (PR #104, F-D3) — require 폴백 패턴 (Kakao 와 동일).
 *
 * <p>iOS 만 지원. {@code @invertase/react-native-apple-authentication} 가 빌드에 없거나
 * Android 면 `appleAuth` 가 null 이라 호출 측에서 비활성 처리 + 적절한 메시지 노출.
 *
 * <p>[PR #104 리뷰 I3] 매뉴얼 interface 선언 → 패키지의 type 직접 import. type-only
 * import 는 native 모듈을 로드하지 않아 Android 빌드에도 안전.
 */
type AppleAuthApi = typeof import('@invertase/react-native-apple-authentication').appleAuth;

let appleAuth: AppleAuthApi | null = null;
if (Platform.OS === 'ios') {
  try {
    const mod = require('@invertase/react-native-apple-authentication');
    appleAuth = mod?.appleAuth ?? mod?.default ?? null;
  } catch {
    appleAuth = null;
  }
}

/**
 * OAuth nonce 생성기 — Kakao/Apple 공통.
 *
 * (PR #112 리뷰 I1) `crypto.getRandomValues` 사용. `index.js` 에서 미리 로드하는
 * `react-native-get-random-values` 폴리필이 RN 에서 globalThis.crypto.getRandomValues
 * 를 설치한다. 폴리필 미로드 환경 (예: 테스트 jest jsdom) 에선 Math.random fallback
 * — 운영 빌드에선 절대 도달하지 않음.
 */
function generateOauthNonce(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const len = 24;
  const cryptoApi =
    typeof globalThis !== 'undefined' && typeof globalThis.crypto !== 'undefined'
      ? globalThis.crypto
      : undefined;
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const bytes = new Uint8Array(len);
    cryptoApi.getRandomValues(bytes);
    let s = '';
    for (let i = 0; i < len; i += 1) {
      const byte = bytes[i] ?? 0;
      s += alphabet.charAt(byte % alphabet.length);
    }
    return s;
  }
  // dev/test fallback — globalThis.crypto 가 없는 환경에서만 (운영 빌드는 폴리필이 깔림).
  let s = '';
  for (let i = 0; i < len; i += 1) {
    s += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return s;
}

function logOauthError(provider: OauthProvider, phase: string, err: unknown) {
  if (!__DEV__) {
    return;
  }
  if (typeof console === 'undefined') {
    return;
  }

  if (err instanceof ApiError) {
    console.error(`[oauth/${provider}] ${phase} api error`, {
      status: err.status,
      code: err.code,
      message: err.message,
    });
    return;
  }

  if (err instanceof ApiTransportError) {
    console.error(`[oauth/${provider}] ${phase} transport error`, {
      status: err.status,
      message: err.message,
    });
    return;
  }

  if (err instanceof ApiSchemaError) {
    console.error(`[oauth/${provider}] ${phase} schema error`, {
      message: err.message,
      issues: err.issues,
    });
    return;
  }

  console.error(`[oauth/${provider}] ${phase} unexpected error`, err);
}

export function useLoginScreen(onLoggedIn: () => void) {
  const exchange = useExchangeOauth();
  const [devOpen, setDevOpen] = useState(false);
  const [devToken, setDevToken] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submitIdToken = async (
    provider: OauthProvider,
    idToken: string,
    nonce?: string,
  ) => {
    setErrorMessage(null);
    try {
      await exchange.mutateAsync({ provider, idToken, nonce });
      setDevToken('');
      setDevOpen(false);
      onLoggedIn();
    } catch (err) {
      logOauthError(provider, 'exchange', err);
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
      // [PR #112] 동일 nonce 를 (1) Kakao SDK 에 넘겨 id_token 에 박히게 하고
      // (2) 백엔드에 함께 보내 서버가 평문 비교로 replay 방어하도록 한다.
      const nonce = generateOauthNonce();
      const result = await kakaoLogin(nonce);
      if (typeof console !== 'undefined') {
        console.info('[oauth/kakao] native login result', {
          hasIdToken: Boolean(result?.idToken),
          hasAccessToken: Boolean(result?.accessToken),
        });
      }
      const idToken = result?.idToken;
      if (!idToken) {
        setErrorMessage(t('auth.login.kakaoNoIdToken'));
        return;
      }
      await submitIdToken('kakao', idToken, nonce);
    } catch (err) {
      logOauthError('kakao', 'native login', err);
      setErrorMessage(toUserMessage(err));
    }
  };

  const onApplePress = async () => {
    if (!appleAuth || !appleAuth.isSupported) {
      setErrorMessage(t('auth.login.appleUnavailable'));
      return;
    }
    setErrorMessage(null);
    try {
      // [PR #112] Apple 은 SHA-256(원본) 을 id_token 에 박는다. 동일 원본을 백엔드에 전달하면
      // 서버가 같은 해시 후 비교 — replay 방어.
      const nonce = generateOauthNonce();
      const result = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
        nonce,
      });
      const idToken = result?.identityToken;
      if (!idToken) {
        setErrorMessage(t('auth.login.appleNoIdToken'));
        return;
      }
      await submitIdToken('apple', idToken, nonce);
    } catch (err) {
      // [PR #104] 사용자가 다이얼로그 dismiss 한 케이스는 errorMessage 로 노출하지 않고
      // 조용히 패스 — appleAuth.Error.CANCELED 또는 메시지 패턴 매칭.
      const code = (err as { code?: string } | undefined)?.code;
      if (code === appleAuth.Error.CANCELED) {
        return;
      }
      // [PR #104 디버그] 운영 메시지 외에 raw error 를 console 로 노출 — Metro/Xcode 로그에서
      // 실제 실패 원인 (네이티브 모듈 미연결 / capability 미설정 / 백엔드 audience 불일치 등)
      // 추적 가능. 사용자에게는 toUserMessage 의 매핑 결과만 노출.
      // eslint-disable-next-line no-console
      console.error('[apple-signin]', err);
      setErrorMessage(toUserMessage(err));
    }
  };

  const onDevSubmit = async () => {
    const trimmed = devToken.trim();
    if (trimmed.length === 0) {
      return;
    }
    // dev 모드는 카카오 idToken 가정 (기존 흐름). 다른 provider 도 필요하면 향후 확장.
    await submitIdToken('kakao', trimmed);
  };

  return {
    devOpen,
    setDevOpen,
    devToken,
    setDevToken,
    errorMessage,
    onKakaoPress,
    onApplePress,
    onDevSubmit,
    isPending: exchange.isPending,
    isKakaoLinked: kakaoLogin !== null,
    isAppleLinked: appleAuth !== null && appleAuth.isSupported,
  };
}
