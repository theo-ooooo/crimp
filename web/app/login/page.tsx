'use client';

import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useCallback, useEffect, useState } from 'react';

import { PrimaryButton, Skeleton } from '@/components/primitives';
import { useExchangeOauth } from '@/hooks/useAuth';
import { toUserMessage } from '@/lib/api/errorMessage';
import { generateOauthState, saveOauthState } from '@/lib/auth/kakaoOauthState';
import { t } from '@/lib/i18n';
import { useAccessToken, useTokenStore } from '@/store/tokenStore';

/**
 * `/login` — Kakao OIDC 소셜 로그인 (v2 redirect) + 개발자 모드 ID 토큰 폴백.
 *
 * 흐름 (v2 redirect — Kakao JS SDK 2.7.x 기준):
 * 1) Kakao JS SDK 를 CDN 으로 로드 (`afterInteractive`, SRI integrity 적용).
 * 2) `Kakao.init(NEXT_PUBLIC_KAKAO_APP_KEY)` — 키 미설정 시 카카오 버튼은 비활성화.
 * 3) 사용자가 카카오 버튼을 클릭하면 `state` (CSRF 가드) 를 sessionStorage 에
 *    저장한 뒤 `Kakao.Auth.authorize({ redirectUri, scope:'openid', state })` 호출.
 *    브라우저가 카카오 로그인 페이지로 redirect.
 * 4) 카카오가 `redirectUri` (= `/login/callback`) 로 `?code=...&state=...` 와
 *    함께 돌려보내면 `/login/callback` 페이지가 state 검증 → 백엔드
 *    `POST /api/v1/auth/oauth/kakao/code` 로 code 교환 → 토큰 저장 → `/` 이동.
 *
 * 왜 redirect? — Kakao JS SDK v2.x 에서 popup 기반 `Auth.login` 이 제거되었기 때문.
 * v1.x 의 `Auth.login({success,fail})` 은 v2.x 에서 호출 시 `TypeError`.
 *
 * 개발자 모드(접이식) — Kakao 앱키 발급 전 또는 백엔드 단독 검증용:
 *  - 사용자가 직접 발급받은 OIDC `id_token` 을 textarea 에 붙여넣고 제출.
 *  - 기존 `useExchangeOauth` 뮤테이션 (id_token 직접 교환) 사용.
 *
 * SSR 가드: hydration 전에는 placeholder 만 노출. 로그인 상태에서 진입 시 `/` 로 즉시 이동.
 */

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY ?? '';

// Kakao JS SDK v2.7.1 SHA-384 — 버전 업 시 재계산:
// `curl -sL https://t1.kakaocdn.net/kakao_js_sdk/2.7.1/kakao.min.js | openssl dgst -sha384 -binary | openssl base64 -A`
const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.1/kakao.min.js';
const KAKAO_SDK_INTEGRITY =
  'sha384-kDljxUXHaJ9xAb2AzRd59KxjrFjzHa5TAoFQ6GbYTCAG0bjM55XohjjDT7tDDC01';

// ===== Kakao SDK 타입 (CDN 로드되는 전역 객체용 최소 선언) =====
//
// 참고: https://developers.kakao.com/docs/latest/ko/kakaologin/js
// v2.x 에서 `Kakao.Auth.authorize` 는 redirect 기반이며 success/fail 콜백을 받지 않는다
// (브라우저 자체가 redirectUri 로 이동). 응답은 `redirectUri` 페이지의 query string
// (`?code=...&state=...&error=...`) 으로 전달된다.

interface KakaoSdk {
  init: (appKey: string) => void;
  isInitialized: () => boolean;
  Auth: {
    /** v2.x — redirect 기반 인가. 호출 즉시 브라우저가 Kakao 로그인 페이지로 이동한다. */
    authorize: (opts: {
      redirectUri: string;
      scope?: string;
      state?: string;
      throughTalk?: boolean;
      prompts?: string;
    }) => void;
  };
}

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useAccessToken();
  const exchange = useExchangeOauth();

  const [sdkReady, setSdkReady] = useState<boolean>(false);
  const [devMode, setDevMode] = useState<boolean>(false);
  const [devToken, setDevToken] = useState<string>('');
  const [kakaoError, setKakaoError] = useState<Error | null>(null);

  const hasAppKey = KAKAO_APP_KEY.length > 0;

  // 이미 로그인된 상태로 진입 시 즉시 홈으로.
  useEffect(() => {
    if (hydrated && accessToken) {
      router.replace('/');
    }
  }, [hydrated, accessToken, router]);

  // 개발자 모드 전용 — id_token 직접 교환.
  const submitIdToken = useCallback(
    (idToken: string) => {
      exchange.mutate(
        { provider: 'kakao', idToken },
        {
          onSuccess: () => {
            setDevToken('');
            setKakaoError(null);
            router.replace('/');
          },
        },
      );
    },
    [exchange, router],
  );

  /**
   * Kakao 로그인 — v2 redirect.
   *
   * (1) state 생성 + sessionStorage 저장,
   * (2) `Kakao.Auth.authorize` 호출 → 브라우저가 Kakao 로 redirect.
   * 후속 처리는 `/login/callback` 페이지가 담당.
   */
  const handleKakaoLogin = useCallback(() => {
    setKakaoError(null);
    if (typeof window === 'undefined') return;
    const sdk = window.Kakao;
    if (!sdk || !sdk.isInitialized()) {
      console.error('[login] kakao-sdk-not-ready');
      setKakaoError(new Error('Kakao SDK is not ready'));
      return;
    }
    const state = generateOauthState();
    saveOauthState(state);
    const redirectUri = `${window.location.origin}/login/callback`;
    sdk.Auth.authorize({
      redirectUri,
      scope: 'openid',
      state,
    });
    // authorize 는 동기적으로 location 변경 → 이 라인 이후 코드는 실행되지 않을 가능성이 높다.
  }, []);

  const handleDevSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = devToken.trim();
      if (!trimmed) return;
      submitIdToken(trimmed);
    },
    [devToken, submitIdToken],
  );

  // hydration 전에는 일반 로딩 placeholder.
  if (!hydrated) {
    return (
      <main
        aria-busy="true"
        aria-live="polite"
        className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 bg-bg px-6 py-10"
      >
        <Skeleton h={20} w="35%" />
        <Skeleton h={32} w="70%" />
        <Skeleton h={56} r={16} />
      </main>
    );
  }

  // 이미 로그인된 사용자 진입 — 안내 메시지 + redirect (useEffect 가 처리).
  if (accessToken) {
    return (
      <main
        aria-live="polite"
        className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 bg-bg px-6 py-10"
      >
        <h1 className="text-h2 font-bold text-text">{t('common.brand')}</h1>
        <p className="text-body text-text-2">{t('auth.login.alreadyLoggedIn')}</p>
      </main>
    );
  }

  const errorToShow = exchange.error ?? kakaoError;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-7 bg-bg px-6 py-10">
      {/* CDN 로드: 키가 있을 때만 init 시도. */}
      {hasAppKey ? (
        <Script
          src={KAKAO_SDK_URL}
          integrity={KAKAO_SDK_INTEGRITY}
          crossOrigin="anonymous"
          strategy="afterInteractive"
          onLoad={() => {
            const sdk = window.Kakao;
            if (!sdk) return;
            if (!sdk.isInitialized()) {
              sdk.init(KAKAO_APP_KEY);
            }
            setSdkReady(true);
          }}
          onError={() => {
            console.error('[login] kakao-sdk-load-failed', KAKAO_SDK_URL);
            setKakaoError(new Error('Failed to load Kakao SDK'));
          }}
        />
      ) : null}

      <header className="flex flex-col gap-2">
        <p className="text-caption font-bold uppercase tracking-[0.3em] text-accent">
          {t('common.brand')}
        </p>
        <h1 className="text-h1 font-extrabold leading-snug tracking-[-0.04em] text-text">
          {t('auth.login.title')}
        </h1>
        <p className="text-body text-text-2">{t('auth.login.tagline')}</p>
      </header>

      <div className="flex flex-col gap-3">
        <PrimaryButton
          aria-label={t('auth.login.kakaoCta')}
          onClick={handleKakaoLogin}
          disabled={!hasAppKey || !sdkReady || exchange.isPending}
        >
          {t('auth.login.kakaoCta')}
        </PrimaryButton>
        {!hasAppKey ? (
          <p className="text-caption text-text-3">
            {t('auth.login.kakaoUnavailableHint')}
          </p>
        ) : null}
      </div>

      {/* 개발자 모드 — 접이식 */}
      <section
        aria-labelledby="login-dev-heading"
        className="flex flex-col gap-3 rounded-2xl bg-subtle p-5 shadow-xs"
      >
        <button
          type="button"
          id="login-dev-heading"
          aria-expanded={devMode}
          aria-controls="login-dev-panel"
          onClick={() => setDevMode((v) => !v)}
          className="flex items-center justify-between text-left text-body font-semibold text-text"
        >
          <span>{t('auth.login.devModeToggle')}</span>
          <span aria-hidden="true" className="text-text-3">
            {devMode ? '−' : '+'}
          </span>
        </button>

        {devMode ? (
          <form
            id="login-dev-panel"
            onSubmit={handleDevSubmit}
            className="flex flex-col gap-3"
          >
            <p className="text-caption text-text-3">
              {t('auth.login.devModeHint')}
            </p>
            <label className="flex flex-col gap-2">
              <span className="text-caption font-semibold text-text-3">
                {t('auth.login.devTokenLabel')}
              </span>
              <textarea
                value={devToken}
                onChange={(e) => setDevToken(e.target.value)}
                rows={4}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                className="w-full resize-y rounded-lg border-0 bg-bg p-3 font-mono text-caption text-text placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="eyJhbGciOi..."
              />
            </label>
            <PrimaryButton
              type="submit"
              disabled={!devToken.trim() || exchange.isPending}
            >
              {t('auth.login.devSubmit')}
            </PrimaryButton>
          </form>
        ) : null}
      </section>

      {errorToShow ? (
        <div role="alert" className="rounded-2xl bg-subtle p-4 shadow-xs">
          <p className="text-title font-bold text-danger">
            {t('auth.login.errorTitle')}
          </p>
          <p className="mt-1 text-body text-text-2">
            {toUserMessage(errorToShow)}
          </p>
        </div>
      ) : null}
    </main>
  );
}
