import { useQuery } from '@tanstack/react-query';

import { fetchHealth } from '@/lib/api';
import type { HealthResponse } from '@/lib/schemas/health';

export const HEALTH_QUERY_KEY = ['health'] as const;

export function useHealthQuery() {
  return useQuery<HealthResponse>({
    queryKey: HEALTH_QUERY_KEY,
    queryFn: ({ signal }) => fetchHealth(signal),
    staleTime: 10_000,
  });
}
