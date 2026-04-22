'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchMe } from '@/lib/api';
import type { Me } from '@/lib/schemas/me';

export const ME_QUERY_KEY = ['me'] as const;

export function useMeQuery(accessToken: string | null) {
  // 토큰은 같은 사용자의 인증 수단일 뿐 식별자가 아니므로 queryKey 에서 제외.
  // 토큰이 refresh 로 바뀌어도 동일한 ['me'] 캐시를 재사용해 불필요한 재요청을 막는다.
  return useQuery<Me>({
    queryKey: ME_QUERY_KEY,
    queryFn: ({ signal }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return fetchMe(accessToken, signal);
    },
    enabled: Boolean(accessToken),
    retry: 0,
  });
}
