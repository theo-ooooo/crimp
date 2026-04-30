'use client';

import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useCallback, useEffect, useState } from 'react';

import { PrimaryButton, Skeleton } from '@/components/primitives';
import { useExchangeOauth } from '@/hooks/useAuth';
import { toUserMessage } from '@/lib/api/errorMessage';
import { generateOauthState, saveOauthState } from '@/lib/auth/oauthState';
import { t } from '@/lib/i18n';
import { useAccessToken, useTokenStore } from '@/store/tokenStore';

/**
 * `/login` — Kakao OIDC 소셜 로그인 (v2 redirect) + 개발자 모드 ID 토큰 폴백.
 *
 * 디자인 (`docs/design/claude/v2/screens-ios-2.jsx:6-48` LoginScreen):
 * - 상단: 브랜드 마크 "Crimp" + 큰 2줄 헤드라인 + 보조 카피
 * - 하단: 카카오 시작 버튼 + (Phase 1.5) Apple/이메일 보조 + 약관 안내
 * - Apple/이메일은 본 PR 에서 미구현 — 카카오만 노출, 나머지는 후속.
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
// PR #106 (PR-W2) — Apple 웹 redirect flow.
// SERVICE_ID 는 Apple Developer Portal 의 Services ID (예: io.crimp.web).
// 미설정 시 Apple 버튼 비활성 (Kakao 와 동일 패턴).
const APPLE_SERVICE_ID = process.env.NEXT_PUBLIC_APPLE_SERVICE_ID ?? '';
const APPLE_AUTHORIZE_URL = 'https://appleid.apple.com/auth/authorize';

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
    saveOauthState({ provider: 'kakao', state });
    const redirectUri = `${window.location.origin}/login/callback`;
    sdk.Auth.authorize({
      redirectUri,
      scope: 'openid',
      state,
    });
    // authorize 는 동기적으로 location 변경 → 이 라인 이후 코드는 실행되지 않을 가능성이 높다.
  }, []);

  /**
   * Apple 로그인 — pure redirect (Apple JS SDK 미사용).
   *
   * Apple Service ID + redirect URI 를 query 로 박아 https://appleid.apple.com/auth/authorize
   * 로 location 이동. 사용자 인증 후 Apple 이 `?code=...&state=...` 와 함께 우리
   * /login/callback 으로 redirect. response_mode=query 사용 — form_post 는 SPA 처리 어려움.
   */
  const handleAppleLogin = useCallback(() => {
    setKakaoError(null);
    if (typeof window === 'undefined') return;
    if (!APPLE_SERVICE_ID) {
      setKakaoError(new Error('Apple Service ID not configured'));
      return;
    }
    const state = generateOauthState();
    const nonce = generateOauthState();
    saveOauthState({ provider: 'apple', state, nonce });
    const redirectUri = `${window.location.origin}/login/callback`;
    const params = new URLSearchParams({
      response_type: 'code',
      response_mode: 'query',
      client_id: APPLE_SERVICE_ID,
      redirect_uri: redirectUri,
      scope: 'name email',
      state,
      nonce,
    });
    window.location.href = `${APPLE_AUTHORIZE_URL}?${params.toString()}`;
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
        className="mx-auto flex min-h-screen max-w-2xl flex-col justify-between bg-bg px-6 pb-10 pt-24"
      >
        <div className="flex flex-col gap-4">
          <Skeleton h={32} w="35%" />
          <Skeleton h={48} w="80%" />
          <Skeleton h={48} w="60%" />
        </div>
        <Skeleton h={56} r={16} />
      </main>
    );
  }

  // 이미 로그인된 사용자 진입 — 안내 메시지 + redirect (useEffect 가 처리).
  if (accessToken) {
    return (
      <main
        aria-live="polite"
        className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-3 bg-bg px-6 py-10"
      >
        <h1 className="text-h2 font-bold text-text">{t('common.brand')}</h1>
        <p className="text-body text-text-2">{t('auth.login.alreadyLoggedIn')}</p>
      </main>
    );
  }

  const errorToShow = exchange.error ?? kakaoError;
  // i18n 의 "\n" 을 실제 줄바꿈으로 — JSON 에 직접 \n 적어도 되지만 일관성을 위해 split.
  const headline = t('auth.login.headline');
  const subTagline = t('auth.login.subTagline');

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-between bg-bg px-5 pb-10 pt-24 sm:pt-32">
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

      {/* 상단: 브랜드 + 큰 헤드라인 — mock paddingTop 120 / px 24 */}
      <header className="flex flex-col gap-7 px-1">
        <p
          aria-label={t('common.brand')}
          className="text-display font-extrabold tracking-[-0.06em] text-text"
          style={{ fontSize: 56, lineHeight: 1 }}
        >
          {t('common.brand')}
        </p>
        <div className="flex flex-col gap-3">
          <h1 className="whitespace-pre-line text-[32px] font-extrabold leading-[1.2] tracking-[-0.04em] text-text">
            {headline}
          </h1>
          <p className="whitespace-pre-line text-[15px] font-medium leading-[1.5] text-text-3">
            {subTagline}
          </p>
        </div>
      </header>

      {/* 중간: 에러 — 발생 시에만 노출. 디자인에는 없지만 UX 상 필요. */}
      {errorToShow ? (
        <div
          role="alert"
          className="mx-1 mt-6 rounded-2xl bg-subtle p-4 shadow-xs"
        >
          <p className="text-title font-bold text-danger">
            {t('auth.login.errorTitle')}
          </p>
          <p className="mt-1 text-body text-text-2">
            {toUserMessage(errorToShow)}
          </p>
        </div>
      ) : null}

      {/* 하단: 카카오 CTA + 약관 + dev mode 토글 — mock paddingBottom 60 / px 20 / gap 10 */}
      <div className="flex flex-col gap-2.5 px-1 pt-8">
        <button
          type="button"
          aria-label={t('auth.login.kakaoCta')}
          onClick={handleKakaoLogin}
          disabled={!hasAppKey || !sdkReady || exchange.isPending}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-lg text-[16px] font-bold tracking-[-0.02em] text-accent-on transition-transform duration-fast ease-standard active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-subtle-2 disabled:text-text-3"
          style={{
            backgroundColor: hasAppKey && sdkReady ? '#FEE500' : undefined,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <KakaoMark />
          {t('auth.login.kakaoCta')}
        </button>
        {!hasAppKey ? (
          <p className="text-caption text-text-3">
            {t('auth.login.kakaoUnavailableHint')}
          </p>
        ) : null}

        {/* PR-W2: Apple 버튼 — Service ID 설정 시 노출. App 디자인 정합 (검은 bg + 흰 텍스트 +
            Apple 로고 SVG). app/AppleLoginButton 의 톤과 동일. */}
        {APPLE_SERVICE_ID ? (
          <button
            type="button"
            aria-label={t('auth.login.appleCta')}
            onClick={handleAppleLogin}
            disabled={exchange.isPending}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-black text-[16px] font-bold tracking-[-0.02em] text-white transition-transform duration-fast ease-standard active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <AppleMark />
            {t('auth.login.appleCta')}
          </button>
        ) : (
          <p className="text-caption text-text-3">
            {t('auth.login.appleUnavailableHint')}
          </p>
        )}

        {/* 약관 안내 — 12px text-3, center, marginTop 12 */}
        <p className="mt-3 px-2 text-center text-caption font-medium leading-[1.5] text-text-3">
          {t('auth.login.termsNotice')}
        </p>

        {/* 개발자 모드 — 접이식 (디자인 mock 에는 없지만 백엔드 단독 검증용 유지) */}
        <section
          aria-labelledby="login-dev-heading"
          className="mt-4 flex flex-col gap-3 rounded-2xl bg-subtle p-5 shadow-xs"
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
                  className="w-full resize-y rounded-md border-0 bg-bg p-3 font-mono text-caption text-text placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent"
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
      </div>
    </main>
  );
}

/**
 * Apple 로고 SVG — 브라우저는 Apple PUA 글리프(U+F8FF) 를 SF Pro 가 아니면 렌더 못 하므로
 * 명시 SVG path. Apple HIG 의 Sign In with Apple 가이드라인 정합 (단색 fill currentColor).
 */
function AppleMark(): JSX.Element {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M14.84 9.42c-.02-2.18 1.78-3.23 1.86-3.28-1.02-1.49-2.6-1.69-3.16-1.71-1.34-.14-2.62.79-3.31.79-.7 0-1.74-.77-2.86-.75-1.47.02-2.83.86-3.59 2.18-1.53 2.65-.39 6.56 1.1 8.71.73 1.05 1.6 2.23 2.74 2.19 1.1-.05 1.52-.71 2.86-.71 1.33 0 1.71.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.83-1.22 1.18-2.4 1.2-2.46-.03-.01-2.31-.89-2.34-3.52ZM12.66 2.97c.61-.74 1.03-1.77.91-2.79-.88.04-1.95.59-2.59 1.32-.57.65-1.07 1.7-.94 2.7.99.08 1.99-.5 2.62-1.23Z" />
    </svg>
  );
}

/**
 * 카카오 브랜드 마크 — mock 의 단순 ellipse 와 동일한 placeholder.
 * 정식 카카오 talk 아이콘은 가이드라인상 라이센스 필요해 추후 교체.
 */
function KakaoMark(): JSX.Element {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="9" cy="8" rx="7.5" ry="6.5" fill="currentColor" />
    </svg>
  );
}
