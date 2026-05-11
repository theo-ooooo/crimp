import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import {
  cancelMyCrewJoinRequest,
  createCrew,
  createMeetup,
  createCrewMeetup,
  decideCrewJoinRequest,
  fetchCrew,
  fetchCrewJoinRequests,
  fetchCrewMembers,
  fetchCrewMeetups,
  fetchCrews,
  fetchMeetup,
  fetchMeetups,
  joinMeetup,
  leaveMeetup as leaveMeetupApi,
  leaveCrew,
  requestCrewJoin,
  updateCrew,
  type CrewListFilters,
} from '@/lib/api/endpoints';
import type {
  CreateCrewBody,
  CreateCrewJoinRequestBody,
  CreateCrewMeetupBody,
  CrewDetail,
  CrewJoinRequest,
  CrewJoinRequestList,
  CrewJoinRequestStatus,
  CrewList,
  CrewMemberList,
  CrewMeetup,
  CrewMeetupList,
  UpdateCrewBody,
} from '@/lib/schemas/crew';

export const CREWS_QUERY_KEY_ROOT = ['crews'] as const;

export function crewsQueryKey(filters: CrewListFilters) {
  return ['crews', filters] as const;
}

export function crewQueryKey(extId: string) {
  return ['crew', extId] as const;
}

export function crewJoinRequestsQueryKey(extId: string, status?: CrewJoinRequestStatus) {
  return ['crew', extId, 'join-requests', status ?? null] as const;
}

export function crewMembersQueryKey(extId: string) {
  return ['crew', extId, 'members'] as const;
}

export function crewMeetupsQueryKey(extId: string) {
  return ['crew', extId, 'meetups'] as const;
}

export function meetupsQueryKey() {
  return ['meetups'] as const;
}

export function meetupQueryKey(extId: string) {
  return ['meetup', extId] as const;
}

export function useCrewsQuery(
  accessToken: string | null,
  filters: CrewListFilters,
  pageSize?: number,
) {
  return useInfiniteQuery<
    CrewList,
    Error,
    InfiniteData<CrewList, number | null>,
    readonly ['crews', CrewListFilters],
    number | null
  >({
    queryKey: crewsQueryKey(filters),
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return fetchCrews(accessToken, pageParam, filters, pageSize, signal);
    },
    getNextPageParam: (last) => last.page.nextCursor,
    enabled: Boolean(accessToken),
    retry: 0,
  });
}

export function useCrewQuery(accessToken: string | null, extId: string | null | undefined) {
  return useQuery<CrewDetail>({
    queryKey: extId ? crewQueryKey(extId) : ['crew', '__none__'],
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

export function useCreateCrew(accessToken: string | null) {
  const qc = useQueryClient();
  return useMutation<CrewDetail, Error, CreateCrewBody>({
    mutationFn: (body) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return createCrew(accessToken, body);
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: CREWS_QUERY_KEY_ROOT });
      qc.setQueryData(crewQueryKey(created.extId), created);
    },
  });
}

export function useUpdateCrew(accessToken: string | null) {
  const qc = useQueryClient();
  return useMutation<CrewDetail, Error, { extId: string; body: UpdateCrewBody }>({
    mutationFn: ({ extId, body }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return updateCrew(accessToken, extId, body);
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: CREWS_QUERY_KEY_ROOT });
      qc.setQueryData(crewQueryKey(updated.extId), updated);
    },
  });
}

export function useRequestCrewJoin(accessToken: string | null) {
  const qc = useQueryClient();
  return useMutation<CrewJoinRequest, Error, { crewExtId: string; body: CreateCrewJoinRequestBody }>({
    mutationFn: ({ crewExtId, body }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return requestCrewJoin(accessToken, crewExtId, body);
    },
    onSuccess: (_, { crewExtId }) => {
      qc.invalidateQueries({ queryKey: CREWS_QUERY_KEY_ROOT });
      qc.invalidateQueries({ queryKey: crewQueryKey(crewExtId) });
    },
  });
}

export function useCancelMyCrewJoinRequest(accessToken: string | null) {
  const qc = useQueryClient();
  return useMutation<CrewJoinRequest, Error, string>({
    mutationFn: (crewExtId) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return cancelMyCrewJoinRequest(accessToken, crewExtId);
    },
    onSuccess: (_, crewExtId) => {
      qc.invalidateQueries({ queryKey: CREWS_QUERY_KEY_ROOT });
      qc.invalidateQueries({ queryKey: crewQueryKey(crewExtId) });
    },
  });
}

export function useCrewJoinRequestsQuery(
  accessToken: string | null,
  crewExtId: string | null | undefined,
  status?: CrewJoinRequestStatus,
  pageSize?: number,
) {
  return useInfiniteQuery<
    CrewJoinRequestList,
    Error,
    InfiniteData<CrewJoinRequestList, number | null>,
    readonly ['crew', string, 'join-requests', CrewJoinRequestStatus | null],
    number | null
  >({
    queryKey: crewExtId
      ? crewJoinRequestsQueryKey(crewExtId, status)
      : (['crew', '__none__', 'join-requests', status ?? null] as const),
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      if (!crewExtId) {
        return Promise.reject(new Error('crew extId is required'));
      }
      return fetchCrewJoinRequests(accessToken, crewExtId, status, pageParam, pageSize, signal);
    },
    getNextPageParam: (last) => last.page.nextCursor,
    enabled: Boolean(accessToken && crewExtId),
    retry: 0,
  });
}

export function useDecideCrewJoinRequest(accessToken: string | null) {
  const qc = useQueryClient();
  return useMutation<
    CrewJoinRequest,
    Error,
    { crewExtId: string; requestExtId: string; decision: 'approve' | 'reject' }
  >({
    mutationFn: ({ crewExtId, requestExtId, decision }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return decideCrewJoinRequest(accessToken, crewExtId, requestExtId, decision);
    },
    onSuccess: (_, { crewExtId }) => {
      qc.invalidateQueries({ queryKey: ['crew', crewExtId, 'join-requests'] });
      qc.invalidateQueries({ queryKey: crewMembersQueryKey(crewExtId) });
      qc.invalidateQueries({ queryKey: crewQueryKey(crewExtId) });
      qc.invalidateQueries({ queryKey: CREWS_QUERY_KEY_ROOT });
    },
  });
}

export function useCrewMembersQuery(
  accessToken: string | null,
  crewExtId: string | null | undefined,
  pageSize?: number,
) {
  return useInfiniteQuery<
    CrewMemberList,
    Error,
    InfiniteData<CrewMemberList, number | null>,
    readonly ['crew', string, 'members'],
    number | null
  >({
    queryKey: crewExtId ? crewMembersQueryKey(crewExtId) : (['crew', '__none__', 'members'] as const),
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      if (!crewExtId) {
        return Promise.reject(new Error('crew extId is required'));
      }
      return fetchCrewMembers(accessToken, crewExtId, pageParam, pageSize, signal);
    },
    getNextPageParam: (last) => last.page.nextCursor,
    enabled: Boolean(accessToken && crewExtId),
    retry: 0,
  });
}

export function useLeaveCrew(accessToken: string | null) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (crewExtId) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return leaveCrew(accessToken, crewExtId);
    },
    onSuccess: (_, crewExtId) => {
      qc.invalidateQueries({ queryKey: CREWS_QUERY_KEY_ROOT });
      qc.invalidateQueries({ queryKey: crewQueryKey(crewExtId) });
      qc.invalidateQueries({ queryKey: crewMembersQueryKey(crewExtId) });
    },
  });
}

export function useCrewMeetupsQuery(
  accessToken: string | null,
  crewExtId: string | null | undefined,
  size?: number,
) {
  return useQuery<CrewMeetupList>({
    queryKey: crewExtId ? crewMeetupsQueryKey(crewExtId) : (['crew', '__none__', 'meetups'] as const),
    queryFn: ({ signal }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      if (!crewExtId) {
        return Promise.reject(new Error('crew extId is required'));
      }
      return fetchCrewMeetups(accessToken, crewExtId, size, signal);
    },
    enabled: Boolean(accessToken && crewExtId),
    retry: 0,
  });
}

export function useCreateCrewMeetup(accessToken: string | null) {
  const qc = useQueryClient();
  return useMutation<CrewMeetup, Error, { crewExtId: string; body: CreateCrewMeetupBody }>({
    mutationFn: ({ crewExtId, body }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return createCrewMeetup(accessToken, crewExtId, body);
    },
    onSuccess: (_, { crewExtId }) => {
      qc.invalidateQueries({ queryKey: crewMeetupsQueryKey(crewExtId) });
    },
  });
}

export function useMeetupsQuery(accessToken: string | null, size?: number) {
  return useQuery<CrewMeetupList>({
    queryKey: meetupsQueryKey(),
    queryFn: ({ signal }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return fetchMeetups(accessToken, size, signal);
    },
    enabled: Boolean(accessToken),
    retry: 0,
  });
}

export function useMeetupQuery(accessToken: string | null, extId: string | null | undefined) {
  return useQuery<CrewMeetup>({
    queryKey: extId ? meetupQueryKey(extId) : (['meetup', '__none__'] as const),
    queryFn: ({ signal }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      if (!extId) {
        return Promise.reject(new Error('meetup extId is required'));
      }
      return fetchMeetup(accessToken, extId, signal);
    },
    enabled: Boolean(accessToken && extId),
    retry: 0,
  });
}

export function useCreateMeetup(accessToken: string | null) {
  const qc = useQueryClient();
  return useMutation<CrewMeetup, Error, CreateCrewMeetupBody>({
    mutationFn: (body) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return createMeetup(accessToken, body);
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: meetupsQueryKey() });
      qc.setQueryData(meetupQueryKey(created.extId), created);
      if (created.crewExtId) {
        qc.invalidateQueries({ queryKey: crewMeetupsQueryKey(created.crewExtId) });
      }
    },
  });
}

export function useJoinMeetup(accessToken: string | null) {
  const qc = useQueryClient();
  return useMutation<CrewMeetup, Error, string>({
    mutationFn: (extId) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return joinMeetup(accessToken, extId);
    },
    onSuccess: (updated) => invalidateMeetupCaches(qc, updated),
  });
}

export function useLeaveMeetup(accessToken: string | null) {
  const qc = useQueryClient();
  return useMutation<CrewMeetup, Error, string>({
    mutationFn: (extId) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return leaveMeetupApi(accessToken, extId);
    },
    onSuccess: (updated) => invalidateMeetupCaches(qc, updated),
  });
}

function invalidateMeetupCaches(
  qc: ReturnType<typeof useQueryClient>,
  updated: CrewMeetup,
) {
  qc.setQueryData(meetupQueryKey(updated.extId), updated);
  qc.invalidateQueries({ queryKey: meetupsQueryKey() });
  if (updated.crewExtId) {
    qc.invalidateQueries({ queryKey: crewMeetupsQueryKey(updated.crewExtId) });
  }
}
