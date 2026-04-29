import { useCallback } from 'react';

import { useSessionsQuery } from '@/hooks/queries/useSessions';
import type { Session } from '@/lib/schemas/session';

export function useSessionListScreen(accessToken: string | null) {
  const query = useSessionsQuery(accessToken);

  const onRefresh = useCallback(() => {
    query.refetch().catch(() => {
      /* 재시도 실패는 error 로 노출 */
    });
  }, [query]);

  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage().catch(() => {
        /* 페이지 실패 무시 */
      });
    }
  }, [query]);

  const sessions: Session[] = query.data?.pages.flatMap((p) => p.items) ?? [];

  return {
    sessions,
    error: query.error ?? null,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isFetchingNextPage: query.isFetchingNextPage,
    onRefresh,
    onEndReached,
  };
}
