import { useQuery } from '@tanstack/react-query';

import { fetchMeStats } from '@/lib/api';
import type { MeStats } from '@/lib/schemas/meStats';

/**
 * 홈 대시보드 집계 훅 (앱).
 *
 * 쿼리키: `['me', 'stats']` — accessToken 은 식별자가 아니므로 포함하지 않는다
 * (refresh 시 동일 사용자 캐시 재사용).
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
