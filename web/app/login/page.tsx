'use client';

import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useCallback, useEffect, useState } from 'react';

import { PrimaryButton, Skeleton } from '@/components/primitives';
import { useExchangeOauth } from '@/hooks/useAuth';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import { useAccessToken, useTokenStore } from '@/store/tokenStore';

/**
 * `/login` — Kakao OIDC 소셜 로그인 + 개발자 모드 ID 토큰 폴백.
 *
 * 흐름:
 * 1) Kakao JS SDK 를 CDN 으로 로드 (`afterInteractive`).
 * 2) `Kakao.init(NEXT_PUBLIC_KAKAO_APP_KEY)` — 키 미설정 시 카카오 버튼은 비활성화.
 * 3) `Kakao.Auth.login({ scope: 'openid' })` 팝업 → 응답 객체에서 `id_token` 추출.
 * 4) `POST /api/v1/auth/oauth/kakao` 로 교환 → `tokenStore.setTokens` → `/` 이동.
 *
 * 개발자 모드(접이식) — Kakao 앱키 발급 전 또는 백엔드 단독 검증용:
 *  - 사용자가 직접 발급받은 OIDC `id_token` 을 textarea 에 붙여넣고 제출.
 *  - 동일한 `useExchangeOauth` 뮤테이션 사용.
 *
 * SSR 가드: hydration 전에는 placeholder 만 노출. 로그인 상태에서 진입 시 `/` 로 즉시 이동.
 */

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY ?? '';

// ===== Kakao SDK 타입 (CDN 로드되는 전역 객체용 최소 선언) =====
//
// TODO(auth): Kakao SDK API 계약 검증 — https://developers.kakao.com/docs/latest/ko/kakaologin/js
// `Kakao.Auth.login` 의 success 콜백은 v2.7.x 기준으로 OIDC 응답 객체를 받으며,
// `scope: 'openid'` 요청 시 `id_token` 필드가 포함된다. CI 환경에서 직접 검증이
// 어려우므로 응답을 unknown 으로 받아 런타임 가드로 안전하게 추출한다.

interface KakaoSdk {
  init: (appKey: string) => void;
  isInitialized: () => boolean;
  Auth: {
    login: (opts: {
      scope?: string;
      throughTalk?: boolean;
      success?: (auth: unknown) => void;
      fail?: (err: unknown) => void;
    }) => void;
  };
}

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

function extractIdToken(authObj: unknown): string | null {
  if (!authObj || typeof authObj !== 'object') return null;
  const record = authObj as Record<string, unknown>;
  // 표준 OIDC 응답 키 우선, 일부 SDK 버전 대비 camelCase 도 시도.
  const candidates = [record.id_token, record.idToken, record.id_Token];
  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 0) return c;
  }
  return null;
}

export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useAccessToken();
  const exchange = useExchangeOauth();

  const [sdkReady, setSdkReady] = useState<boolean>(false);
  const [devMode, setDevMode] = useState<boolean>(false);
  const [devToken, setDevToken] = useState<string>('');
  const [kakaoError, setKakaoError] = useState<unknown>(null);

  const hasAppKey = KAKAO_APP_KEY.length > 0;

  // 이미 로그인된 상태로 진입 시 즉시 홈으로.
  useEffect(() => {
    if (hydrated && accessToken) {
      router.replace('/');
    }
  }, [hydrated, accessToken, router]);

  const handleKakaoLogin = useCallback(() => {
    setKakaoError(null);
    if (typeof window === 'undefined') return;
    const sdk = window.Kakao;
    if (!sdk || !sdk.isInitialized()) {
      setKakaoError(new Error('Kakao SDK is not ready'));
      return;
    }
    sdk.Auth.login({
      scope: 'openid',
      throughTalk: false,
      success: (authObj: unknown) => {
        const idToken = extractIdToken(authObj);
        if (!idToken) {
          setKakaoError(new Error('id_token missing in Kakao response'));
          return;
        }
        exchange.mutate(
          { provider: 'kakao', idToken },
          {
            onSuccess: () => {
              router.replace('/');
            },
          },
        );
      },
      fail: (err: unknown) => {
        setKakaoError(err);
      },
    });
  }, [exchange, router]);

  const handleDevSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = devToken.trim();
      if (!trimmed) return;
      exchange.mutate(
        { provider: 'kakao', idToken: trimmed },
        {
          onSuccess: () => {
            router.replace('/');
          },
        },
      );
    },
    [devToken, exchange, router],
  );

  // hydration 전이거나, 이미 로그인된 상태(redirect 직전)면 placeholder.
  if (!hydrated || accessToken) {
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

  const errorToShow = exchange.error ?? kakaoError;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-7 bg-bg px-6 py-10">
      {/* CDN 로드: 키가 있을 때만 init 시도. */}
      {hasAppKey ? (
        <Script
          // TODO(auth): Kakao SDK SRI integrity 해시 추가
          // (`curl -sL <url> | openssl dgst -sha384 -binary | openssl base64 -A`).
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.1/kakao.min.js"
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
