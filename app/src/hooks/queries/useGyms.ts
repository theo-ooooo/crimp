import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
} from '@tanstack/react-query';

import {
  fetchGym,
  fetchGymActiveSessions,
  fetchGymRecentActivity,
  fetchGymRoutes,
  fetchGyms,
} from '@/lib/api';
import type {
  GymActiveSessions,
  GymDetail,
  GymList,
  GymRecentActivity,
  RouteList,
} from '@/lib/schemas/gym';

/**
 * Gym 관련 React Query 훅 (앱).
 *
 * 쿼리키 규약:
 *   - 목록: `['gyms', { q, brand }]`
 *   - 상세: `['gym', extId]`
 *   - 루트: `['gym', extId, 'routes']`
 *
 * accessToken 은 식별자가 아니므로 queryKey 에 포함하지 않는다 (세션 훅과 동일 규칙).
 */

export type GymsQueryFilters = {
  q?: string;
  brand?: string;
};

export function gymsQueryKey(filters: GymsQueryFilters) {
  return ['gyms', filters] as const;
}

export function gymQueryKey(extId: string) {
  return ['gym', extId] as const;
}

export function gymRoutesQueryKey(extId: string) {
  return ['gym', extId, 'routes'] as const;
}

export function gymRecentActivityQueryKey(extId: string) {
  return ['gym', extId, 'recent-activity'] as const;
}

export function gymActiveSessionsQueryKey(extId: string) {
  return ['gym', extId, 'active-sessions'] as const;
}

export function useGymsQuery(filters: GymsQueryFilters, pageSize?: number) {
  return useInfiniteQuery<
    GymList,
    Error,
    InfiniteData<GymList, number | null>,
    readonly ['gyms', GymsQueryFilters],
    number | null
  >({
    queryKey: gymsQueryKey(filters),
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) =>
      fetchGyms(pageParam, filters.q, filters.brand, pageSize, signal),
    getNextPageParam: (last) => last.page.nextCursor,
    retry: 0,
  });
}

export function useGymQuery(extId: string | null | undefined) {
  return useQuery<GymDetail>({
    queryKey: extId ? gymQueryKey(extId) : ['gym', '__none__'],
    queryFn: ({ signal }) => {
      if (!extId) {
        return Promise.reject(new Error('gym extId is required'));
      }
      return fetchGym(extId, signal);
    },
    enabled: Boolean(extId),
    retry: 0,
  });
}

export function useGymRoutesQuery(
  accessToken: string | null,
  gymExtId: string | null | undefined,
  pageSize?: number,
) {
  return useInfiniteQuery<
    RouteList,
    Error,
    InfiniteData<RouteList, number | null>,
    readonly ['gym', string, 'routes'],
    number | null
  >({
    queryKey: gymExtId
      ? gymRoutesQueryKey(gymExtId)
      : (['gym', '__none__', 'routes'] as const),
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      if (!gymExtId) {
        return Promise.reject(new Error('gym extId is required'));
      }
      return fetchGymRoutes(accessToken, gymExtId, pageParam, pageSize, signal);
    },
    getNextPageParam: (last) => last.page.nextCursor,
    enabled: Boolean(accessToken && gymExtId),
    retry: 0,
  });
}

export function useGymRecentActivityQuery(
  gymExtId: string | null | undefined,
  size?: number,
) {
  return useQuery<GymRecentActivity>({
    queryKey: gymExtId
      ? gymRecentActivityQueryKey(gymExtId)
      : ['gym', '__none__', 'recent-activity'],
    queryFn: ({ signal }) => {
      if (!gymExtId) {
        return Promise.reject(new Error('gym extId is required'));
      }
      return fetchGymRecentActivity(gymExtId, size, signal);
    },
    enabled: Boolean(gymExtId),
    retry: 0,
  });
}

export function useGymActiveSessionsQuery(
  gymExtId: string | null | undefined,
) {
  return useQuery<GymActiveSessions>({
    queryKey: gymExtId
      ? gymActiveSessionsQueryKey(gymExtId)
      : ['gym', '__none__', 'active-sessions'],
    queryFn: ({ signal }) => {
      if (!gymExtId) {
        return Promise.reject(new Error('gym extId is required'));
      }
      return fetchGymActiveSessions(gymExtId, signal);
    },
    enabled: Boolean(gymExtId),
    retry: 0,
  });
}
