'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAccessToken, useTokenStore } from '@/store/tokenStore';

/**
 * 인증이 필요한 페이지에서 사용하는 가드 훅.
 *
 * - hydration 완료 후 `accessToken` 이 없으면 `/login` 으로 replace.
 * - 호출부는 반환된 `{ hydrated, accessToken }` 으로 렌더링 분기:
 *   - hydration 전: skeleton/로딩 표시
 *   - 토큰 없음: redirect 가 실행되는 동안 짧게 로딩 placeholder 표시 (한 프레임)
 *   - 토큰 있음: 정상 렌더링
 *
 * 왜 useEffect 안에서 redirect 하는가? — Next.js App Router 는 렌더 도중
 * `router.replace` 를 호출하면 hydration mismatch 가 생긴다. effect 로 미루면
 * 클라이언트 마운트 후 navigation 이 안전하게 일어난다.
 *
 * `replace` 사용 — 뒤로가기로 돌아오면 또 redirect 되는 루프를 피하기 위해
 * 히스토리에 인증 필요 페이지를 남기지 않는다.
 */
export function useRequireAuth(): {
  hydrated: boolean;
  accessToken: string | null;
} {
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useAccessToken();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace('/login');
    }
  }, [hydrated, accessToken, router]);

  return { hydrated, accessToken };
}
