'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import {
  cancelMyCrewJoinRequest,
  fetchCrew,
  fetchCrews,
  requestCrewJoin,
  type CrewListFilters,
} from '@/lib/api';
import type {
  CreateCrewJoinRequestBody,
  CrewDetail,
  CrewList,
} from '@/lib/schemas/crew';

function normalizeText(v: string | null | undefined): string | null {
  if (v === undefined || v === null) return null;
  const trimmed = v.trim();
  return trimmed === '' ? null : trimmed;
}

export function normalizeCrewFilters(filters: CrewListFilters): CrewListFilters {
  return {
    q: normalizeText(filters.q),
    region: normalizeText(filters.region),
    gymExtId: normalizeText(filters.gymExtId),
    levelBand: filters.levelBand ?? null,
    style: filters.style ?? null,
  };
}

export function crewsQueryKey(filters: CrewListFilters) {
  return ['crews', normalizeCrewFilters(filters)] as const;
}

export function crewQueryKey(extId: string) {
  return ['crew', extId] as const;
}

export function useCrewsQuery(
  accessToken: string | null,
  filters: CrewListFilters,
  pageSize?: number,
) {
  const normalized = normalizeCrewFilters(filters);
  return useInfiniteQuery<
    CrewList,
    Error,
    InfiniteData<CrewList, number | null>,
    ReturnType<typeof crewsQueryKey>,
    number | null
  >({
    queryKey: crewsQueryKey(normalized),
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return fetchCrews(accessToken, pageParam, normalized, pageSize, signal);
    },
    getNextPageParam: (last) => last.page.nextCursor,
    enabled: Boolean(accessToken),
    retry: 0,
  });
}

export function useCrewQuery(
  accessToken: string | null,
  extId: string | null | undefined,
) {
  return useQuery<CrewDetail>({
    queryKey: extId ? crewQueryKey(extId) : (['crew', '__none__'] as const),
    queryFn: ({ signal }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      if (!extId) {
        return Promise.reject(new Error('crew extId is required'));
      }
      return fetchCrew(accessToken, extId, signal);
    },
    enabled: Boolean(accessToken && extId),
    retry: 0,
  });
}

export function useRequestCrewJoin(accessToken: string | null) {
  const qc = useQueryClient();
  return useMutation<void, Error, { crewExtId: string; body: CreateCrewJoinRequestBody }>({
    mutationFn: ({ crewExtId, body }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return requestCrewJoin(accessToken, crewExtId, body);
    },
    onSuccess: (_, { crewExtId }) => {
      qc.invalidateQueries({ queryKey: crewQueryKey(crewExtId) });
      qc.invalidateQueries({ queryKey: ['crews'] });
    },
  });
}

export function useCancelMyCrewJoinRequest(accessToken: string | null) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (crewExtId) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return cancelMyCrewJoinRequest(accessToken, crewExtId);
    },
    onSuccess: (_, crewExtId) => {
      qc.invalidateQueries({ queryKey: crewQueryKey(crewExtId) });
      qc.invalidateQueries({ queryKey: ['crews'] });
    },
  });
}
