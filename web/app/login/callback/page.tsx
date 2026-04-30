'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import { Skeleton } from '@/components/primitives';
import { useExchangeOauthCode } from '@/hooks/useAuth';
import { toUserMessage } from '@/lib/api/errorMessage';
import { consumeOauthState } from '@/lib/auth/oauthState';
import { t } from '@/lib/i18n';
import { useAccessToken, useTokenStore } from '@/store/tokenStore';

/**
 * `/login/callback` — Kakao Auth.authorize 의 redirect 도착 페이지.
 *
 * 흐름:
 *  1) `?code=...&state=...&error=...` 파싱.
 *  2) `error` 가 있으면 그대로 사용자에게 표시 후 로그인 페이지 재시도 링크.
 *  3) sessionStorage 의 `state` 와 일치 검증 (CSRF 가드). 불일치 시 즉시 실패.
 *  4) `useExchangeOauthCode` 뮤테이션으로 백엔드 `POST /auth/oauth/kakao/code` 교환.
 *  5) 성공 시 `tokenStore.setTokens` (훅 내부) → `router.replace('/')`.
 *
 * 동작 보장:
 *  - 한 번 마운트되면 code 교환은 정확히 한 번만 실행 (`startedRef` 가드).
 *  - 이미 로그인된 상태로 진입 시(예: 새로고침) 즉시 홈으로 이동 — 중복 교환 방지.
 *  - 모든 사용자 문구는 i18n. 애니메이션 없음 (reduced-motion 준수).
 *
 * Next.js 14 가드: `useSearchParams` 가 prerender 단계에서 CSR bailout 을
 * 트리거하므로, 컴포넌트를 Suspense 로 감싸야 한다 (라우트 export default 가
 * Suspense, 내부에서만 useSearchParams 사용).
 */

type CallbackPhase = 'idle' | 'loading' | 'success' | 'error';

interface CallbackError {
  /** 화면에 그대로 노출할 문구. */
  message: string;
}

function LoadingView(): JSX.Element {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 bg-bg px-6 py-10"
    >
      <p className="text-body text-text-2">{t('auth.login.callbackProcessing')}</p>
      <Skeleton h={20} w="60%" />
      <Skeleton h={20} w="40%" />
      <Skeleton h={56} r={16} />
    </main>
  );
}

function CallbackInner(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useAccessToken();
  const exchange = useExchangeOauthCode();

  const [phase, setPhase] = useState<CallbackPhase>('idle');
  const [error, setError] = useState<CallbackError | null>(null);
  const startedRef = useRef<boolean>(false);

  // 이미 로그인된 상태라면 즉시 홈으로 (중복 교환 방지).
  useEffect(() => {
    if (hydrated && accessToken) {
      router.replace('/');
    }
  }, [hydrated, accessToken, router]);

  // hydration 이 끝나면 한 번만 교환 시도.
  useEffect(() => {
    if (!hydrated) return;
    if (accessToken) return; // 위 useEffect 가 redirect 처리.
    if (startedRef.current) return;
    startedRef.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errParam = searchParams.get('error');
    const errDesc = searchParams.get('error_description');

    // 1) Kakao 가 명시 에러로 돌아온 경우. state 는 항상 한 번만 소비되도록 비운다.
    if (errParam) {
      consumeOauthState();
      setPhase('error');
      setError({
        message: errDesc?.trim()
          ? errDesc
          : `${t('auth.login.callbackErrorTitle')} (${errParam})`,
      });
      return;
    }

    // 2) code/state 누락.
    if (!code || !state) {
      consumeOauthState();
      setPhase('error');
      setError({ message: t('auth.login.callbackInvalidParam') });
      return;
    }

    // 3) state CSRF 검증 + provider 식별 — sessionStorage 에서 한 번 읽고 즉시 제거.
    //    (PR #106, PR-W2: kakao/apple 모두 같은 callback 으로 돌아오므로 저장된 provider
    //    필드를 신뢰해 백엔드 교환 endpoint 분기.)
    const expected = consumeOauthState();
    if (!expected || expected.state !== state) {
      setPhase('error');
      setError({ message: t('auth.login.callbackStateMismatch') });
      return;
    }

    // 4) 백엔드 교환 — provider 별 동일 endpoint (`/auth/oauth/{provider}/code`).
    setPhase('loading');
    const redirectUri = `${window.location.origin}/login/callback`;
    exchange.mutate(
      { provider: expected.provider, code, redirectUri },
      {
        onSuccess: () => {
          setPhase('success');
          router.replace('/');
        },
        onError: (err) => {
          setPhase('error');
          setError({ message: toUserMessage(err) });
        },
      },
    );
  }, [hydrated, accessToken, searchParams, exchange, router]);

  if (!hydrated || phase === 'idle' || phase === 'loading' || phase === 'success') {
    return <LoadingView />;
  }

  return (
    <main
      aria-live="polite"
      className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 bg-bg px-6 py-10"
    >
      <div role="alert" className="rounded-2xl bg-subtle p-4 shadow-xs">
        <p className="text-title font-bold text-danger">
          {t('auth.login.callbackErrorTitle')}
        </p>
        <p className="mt-1 text-body text-text-2">
          {error?.message ?? t('auth.login.callbackInvalidParam')}
        </p>
      </div>
      <Link
        href="/login"
        className="self-start rounded-full bg-accent px-5 py-3 text-body font-semibold text-bg"
      >
        {t('auth.login.retryCta')}
      </Link>
    </main>
  );
}

export default function LoginCallbackPage(): JSX.Element {
  return (
    <Suspense fallback={<LoadingView />}>
      <CallbackInner />
    </Suspense>
  );
}
