import { useQuery } from '@tanstack/react-query';

import { fetchMe } from '@/lib/api';
import type { Me } from '@/lib/schemas/me';

/**
 * `GET /api/v1/me` 훅 (앱).
 * 쿼리키: `['me']` — accessToken 은 식별자가 아니므로 포함하지 않는다.
 */
export const ME_QUERY_KEY = ['me'] as const;

export function useMeQuery(accessToken: string | null) {
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
