import { useCallback } from 'react';

import {
  useGymActiveSessionsQuery,
  useGymQuery,
  useGymRecentActivityQuery,
  useGymRoutesQuery,
} from '@/hooks/queries/useGyms';

export function useGymDetailScreen(extId: string, accessToken: string | null) {
  const gymQuery = useGymQuery(extId);
  const routesQuery = useGymRoutesQuery(accessToken, accessToken ? extId : null);
  const recentActivityQuery = useGymRecentActivityQuery(extId, 6);
  const activeSessionsQuery = useGymActiveSessionsQuery(extId);

  const onLoadMoreRoutes = useCallback(() => {
    if (routesQuery.hasNextPage && !routesQuery.isFetchingNextPage) {
      routesQuery.fetchNextPage().catch(() => {});
    }
  }, [routesQuery]);

  return {
    gymQuery,
    routesQuery,
    recentActivityQuery,
    activeSessionsQuery,
    gym: gymQuery.data ?? null,
    routes: routesQuery.data?.pages.flatMap((p) => p.items) ?? [],
    onLoadMoreRoutes,
  };
}
