'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Route } from 'next';

import { onboardingDismiss } from '@/lib/auth/onboardingDismiss';
import { shouldShowOnboardingGate } from '@/lib/onboardingGate';
import {
  COOKIE_AUTH_ACCESS_TOKEN,
  useAccessToken,
  useCookieAuthCandidate,
  useTokenStore,
} from '@/store/tokenStore';

import { useMeQuery } from './useMe';

const ONBOARDING_PATH = '/onboarding/main-gym' as const;

/**
 * 인증이 필요한 페이지에서 사용하는 가드 훅.
 *
 * - hydration 완료 후 `accessToken` 이 없으면 `/login` 으로 replace.
 * - 인증된 상태에서 `me.mainGym` 이 비어 있고 현재 세션에서 게이트를 dismiss 하지
 *   않았다면 `/onboarding/main-gym?next=<현재경로>` 로 replace (기획 §5.5).
 * - `/onboarding/main-gym` 페이지 자체에서 호출하면 redirect 무한 루프를 방지하기
 *   위해 가드 분기에서 제외 (`opts.skipOnboardingGate=true` 또는 pathname 일치).
 *
 * 반환값은 `accessToken` 단일 — null 이면 호출부가 skeleton/로딩 placeholder 를
 * 렌더하고, 그 사이 effect 가 redirect 를 트리거.
 *
 * 왜 useEffect 안에서 redirect 하는가? — Next.js App Router 는 렌더 도중
 * `router.replace` 를 호출하면 hydration mismatch 가 생긴다. effect 로 미루면
 * 클라이언트 마운트 후 navigation 이 안전하게 일어난다.
 *
 * `replace` 사용 — 뒤로가기로 돌아오면 또 redirect 되는 루프를 피하기 위해
 * 히스토리에 인증/온보딩 필요 페이지를 남기지 않는다.
 */
export function useRequireAuth(opts?: { skipOnboardingGate?: boolean }): string | null {
  const hydrated = useTokenStore((s) => s.hydrated);
  const markCookieAuthenticated = useTokenStore((s) => s.markCookieAuthenticated);
  const accessToken = useAccessToken();
  const cookieAuthCandidate = useCookieAuthCandidate();
  const effectiveAccessToken =
    accessToken ?? (cookieAuthCandidate ? COOKIE_AUTH_ACCESS_TOKEN : null);
  const meQuery = useMeQuery(effectiveAccessToken);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hydrated) return;
    if (cookieAuthCandidate) {
      if (meQuery.data) {
        markCookieAuthenticated();
      }
      if (!meQuery.isError) return;
    }
    if (!effectiveAccessToken) {
      router.replace('/login');
      return;
    }
    if (opts?.skipOnboardingGate) return;
    if (pathname === ONBOARDING_PATH) return;

    const dismissed = onboardingDismiss.isDismissed();
    const needsOnboarding = shouldShowOnboardingGate({
      accessToken,
      me: meQuery.data,
      onboardingDismissed: dismissed,
    });
    if (needsOnboarding) {
      const next = pathname && pathname !== '/' ? pathname : '/';
      router.replace(
        `${ONBOARDING_PATH}?next=${encodeURIComponent(next)}` as Route,
      );
    }
  }, [
    hydrated,
    accessToken,
    effectiveAccessToken,
    cookieAuthCandidate,
    meQuery.data,
    meQuery.isError,
    markCookieAuthenticated,
    router,
    pathname,
    opts?.skipOnboardingGate,
  ]);

  return effectiveAccessToken;
}
