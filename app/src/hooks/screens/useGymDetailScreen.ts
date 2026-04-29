import { useCallback } from 'react';

import { useGymQuery, useGymRoutesQuery } from '@/hooks/queries/useGyms';

export function useGymDetailScreen(extId: string, accessToken: string | null) {
  const gymQuery = useGymQuery(extId);
  const routesQuery = useGymRoutesQuery(accessToken, accessToken ? extId : null);

  const onLoadMoreRoutes = useCallback(() => {
    if (routesQuery.hasNextPage && !routesQuery.isFetchingNextPage) {
      routesQuery.fetchNextPage().catch(() => {});
    }
  }, [routesQuery]);

  return {
    gymQuery,
    routesQuery,
    gym: gymQuery.data ?? null,
    routes: routesQuery.data?.pages.flatMap((p) => p.items) ?? [],
    onLoadMoreRoutes,
  };
}
