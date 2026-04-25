'use client';

import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
} from '@tanstack/react-query';

import { fetchGym, fetchGymRoutes, fetchGyms } from '@/lib/api';
import type { GymDetail, GymList, RouteList } from '@/lib/schemas/gym';

/**
 * Gym 관련 React Query 훅.
 *
 * 쿼리키 규약:
 *   - 목록: `['gyms', { q, brand }]` — 검색/필터 파라미터는 캐시 식별자이므로 키에 포함.
 *     빈 문자열/undefined 는 `null` 로 정규화해서 동일 조건이면 재사용.
 *   - 상세: `['gym', extId]`
 *   - 루트: `['gym', extId, 'routes']`
 *
 * 토큰은 `useSessionsQuery` 선례와 동일하게 queryKey 에 포함하지 않는다.
 */

export interface GymsQueryParams {
  q?: string | null;
  brand?: string | null;
}

/** 빈 문자열/undefined → null 정규화해 캐시키 안정성 확보. */
function normalizeParam(v: string | null | undefined): string | null {
  if (v === undefined || v === null) return null;
  const trimmed = v.trim();
  return trimmed === '' ? null : trimmed;
}

export function gymsQueryKey(params: GymsQueryParams) {
  return [
    'gyms',
    { q: normalizeParam(params.q), brand: normalizeParam(params.brand) },
  ] as const;
}

export function gymQueryKey(extId: string) {
  return ['gym', extId] as const;
}

export function gymRoutesQueryKey(extId: string) {
  return ['gym', extId, 'routes'] as const;
}

/**
 * 암장 검색·목록을 무한 스크롤로 로드.
 *
 * 인증 불필요 — `fetchGyms` 는 Bearer 없이 호출 가능.
 * `pageParam` 은 다음 커서 (`null` 이면 첫 페이지).
 */
export function useGymsQuery(params: GymsQueryParams, pageSize?: number) {
  const q = normalizeParam(params.q);
  const brand = normalizeParam(params.brand);
  return useInfiniteQuery<
    GymList,
    Error,
    InfiniteData<GymList, number | null>,
    ReturnType<typeof gymsQueryKey>,
    number | null
  >({
    queryKey: gymsQueryKey({ q, brand }),
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) =>
      fetchGyms(pageParam, q, brand, pageSize, signal),
    getNextPageParam: (last) => last.page.nextCursor,
    retry: 0,
  });
}

/**
 * 암장 단건 조회. 인증 불필요.
 */
export function useGymQuery(extId: string | null | undefined) {
  return useQuery<GymDetail>({
    queryKey: extId ? gymQueryKey(extId) : (['gym', '__none__'] as const),
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

/**
 * 암장 활성 루트 목록 — 무한 스크롤. Bearer 필요.
 */
export function useGymRoutesQuery(
  accessToken: string | null,
  gymExtId: string | null | undefined,
  pageSize?: number,
) {
  return useInfiniteQuery<
    RouteList,
    Error,
    InfiniteData<RouteList, number | null>,
    ReturnType<typeof gymRoutesQueryKey>,
    number | null
  >({
    queryKey: gymRoutesQueryKey(gymExtId ?? '__none__'),
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
