'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  deleteAttempt,
  listAttempts,
  logAttempt,
  updateAttempt,
} from '@/lib/api';
import type {
  Attempt,
  AttemptList,
  LogAttemptBody,
  UpdateAttemptBody,
} from '@/lib/schemas/attempt';

/**
 * Attempt(시도) 관련 React Query 훅.
 *
 * 쿼리키 규약:
 *   - 목록: `['attempts', sessionExtId]`
 *
 * 상세는 현재 화면 플로우상 불필요해 단일 쿼리로 추가하지 않음.
 */

export function attemptsQueryKey(sessionExtId: string) {
  return ['attempts', sessionExtId] as const;
}

export function useAttemptsQuery(
  accessToken: string | null,
  sessionExtId: string | null | undefined,
) {
  return useQuery<AttemptList>({
    queryKey: sessionExtId
      ? attemptsQueryKey(sessionExtId)
      : ['attempts', '__none__'],
    queryFn: ({ signal }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      if (!sessionExtId) {
        return Promise.reject(new Error('session extId is required'));
      }
      return listAttempts(accessToken, sessionExtId, signal);
    },
    enabled: Boolean(accessToken && sessionExtId),
    retry: 0,
  });
}

export function useLogAttempt(
  accessToken: string | null,
  sessionExtId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation<Attempt, Error, LogAttemptBody>({
    mutationFn: (body) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      if (!sessionExtId) {
        return Promise.reject(new Error('session extId is required'));
      }
      return logAttempt(accessToken, sessionExtId, body);
    },
    onSuccess: () => {
      if (sessionExtId) {
        qc.invalidateQueries({ queryKey: attemptsQueryKey(sessionExtId) });
      }
    },
  });
}

export function useUpdateAttempt(
  accessToken: string | null,
  sessionExtId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation<Attempt, Error, { extId: string; body: UpdateAttemptBody }>({
    mutationFn: ({ extId, body }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return updateAttempt(accessToken, extId, body);
    },
    onSuccess: () => {
      if (sessionExtId) {
        qc.invalidateQueries({ queryKey: attemptsQueryKey(sessionExtId) });
      }
    },
  });
}

export function useDeleteAttempt(
  accessToken: string | null,
  sessionExtId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (extId) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return deleteAttempt(accessToken, extId);
    },
    onSuccess: () => {
      if (sessionExtId) {
        qc.invalidateQueries({ queryKey: attemptsQueryKey(sessionExtId) });
      }
    },
  });
}
