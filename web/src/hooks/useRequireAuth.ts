'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAccessToken, useTokenStore } from '@/store/tokenStore';

/**
 * 인증이 필요한 페이지에서 사용하는 가드 훅.
 *
 * - hydration 완료 후 `accessToken` 이 없으면 `/login` 으로 replace.
 * - 반환값은 `accessToken` 단일 — null 이면 호출부가 skeleton/로딩 placeholder 를
 *   렌더하고, 그 사이 effect 가 redirect 를 트리거.
 *   (hydration 전·후를 구분하지 않는 이유: 두 경우 모두 "아직 토큰 없음" 상태로
 *   동일하게 placeholder 를 보여주면 충분.)
 *
 * 왜 useEffect 안에서 redirect 하는가? — Next.js App Router 는 렌더 도중
 * `router.replace` 를 호출하면 hydration mismatch 가 생긴다. effect 로 미루면
 * 클라이언트 마운트 후 navigation 이 안전하게 일어난다.
 *
 * `replace` 사용 — 뒤로가기로 돌아오면 또 redirect 되는 루프를 피하기 위해
 * 히스토리에 인증 필요 페이지를 남기지 않는다.
 */
export function useRequireAuth(): string | null {
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useAccessToken();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace('/login');
    }
  }, [hydrated, accessToken, router]);

  return accessToken;
}
