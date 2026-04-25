'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchMeStats } from '@/lib/api';
import type { MeStats } from '@/lib/schemas/meStats';

/**
 * `GET /api/v1/me/stats` — 홈 대시보드용 React Query 훅.
 *
 * `useMeQuery` 선례와 동일하게 accessToken 은 queryKey 에 포함하지 않는다.
 * 토큰이 refresh 로 바뀌어도 동일한 캐시(`['me','stats']`) 를 재사용한다.
 */
export const ME_STATS_QUERY_KEY = ['me', 'stats'] as const;

export function useMeStatsQuery(accessToken: string | null) {
  return useQuery<MeStats>({
    queryKey: ME_STATS_QUERY_KEY,
    queryFn: ({ signal }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return fetchMeStats(accessToken, signal);
    },
    enabled: Boolean(accessToken),
    retry: 0,
  });
}
