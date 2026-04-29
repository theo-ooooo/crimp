import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import {
  deleteSession,
  fetchMySessions,
  fetchSession,
  startSession,
  updateSession,
} from '@/lib/api';
import type {
  Session,
  SessionList,
  StartSessionBody,
  UpdateSessionBody,
} from '@/lib/schemas/session';

/**
 * Session 관련 React Query 훅 (앱).
 *
 * 쿼리키 규약:
 *   - 목록: `['sessions']`
 *   - 상세: `['session', extId]`
 *
 * accessToken 은 식별자가 아니므로 queryKey 에 포함하지 않는다.
 */

export const SESSIONS_QUERY_KEY = ['sessions'] as const;

export function sessionQueryKey(extId: string) {
  return ['session', extId] as const;
}

export function useSessionsQuery(accessToken: string | null, pageSize?: number) {
  return useInfiniteQuery<
    SessionList,
    Error,
    InfiniteData<SessionList, number | null>,
    typeof SESSIONS_QUERY_KEY,
    number | null
  >({
    queryKey: SESSIONS_QUERY_KEY,
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return fetchMySessions(accessToken, pageParam, pageSize, signal);
    },
    getNextPageParam: (last) => last.page.nextCursor,
    enabled: Boolean(accessToken),
    retry: 0,
  });
}

export function useSessionQuery(accessToken: string | null, extId: string | null | undefined) {
  return useQuery<Session>({
    queryKey: extId ? sessionQueryKey(extId) : ['session', '__none__'],
    queryFn: ({ signal }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      if (!extId) {
        return Promise.reject(new Error('session extId is required'));
      }
      return fetchSession(accessToken, extId, signal);
    },
    enabled: Boolean(accessToken && extId),
    retry: 0,
  });
}

export function useStartSession(accessToken: string | null) {
  const qc = useQueryClient();
  return useMutation<Session, Error, StartSessionBody>({
    mutationFn: (body) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return startSession(accessToken, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
    },
  });
}

export function useUpdateSession(accessToken: string | null) {
  const qc = useQueryClient();
  return useMutation<Session, Error, { extId: string; body: UpdateSessionBody }>({
    mutationFn: ({ extId, body }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return updateSession(accessToken, extId, body);
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: sessionQueryKey(updated.extId) });
    },
  });
}

export function useEndSession(accessToken: string | null) {
  const update = useUpdateSession(accessToken);
  return {
    ...update,
    endSession: (extId: string, endedAt?: string) =>
      update.mutateAsync({
        extId,
        body: { endedAt: endedAt ?? new Date().toISOString() },
      }),
  };
}

export function useDeleteSession(accessToken: string | null) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (extId) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return deleteSession(accessToken, extId);
    },
    onSuccess: (_, extId) => {
      qc.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
      qc.removeQueries({ queryKey: sessionQueryKey(extId) });
    },
  });
}
