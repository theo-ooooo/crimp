'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchMe } from '@/lib/api';
import type { Me } from '@/lib/schemas/me';

export const ME_QUERY_KEY = ['me'] as const;

export function useMeQuery(accessToken: string | null) {
  return useQuery<Me>({
    queryKey: [...ME_QUERY_KEY, accessToken],
    queryFn: ({ signal }) => {
      if (!accessToken) {
        // enabled 가드를 뚫고 들어오는 경우를 방어.
        return Promise.reject(new Error('access token is required'));
      }
      return fetchMe(accessToken, signal);
    },
    enabled: Boolean(accessToken),
    retry: 0,
  });
}
