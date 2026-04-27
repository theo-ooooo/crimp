'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateMyProfile, type UpdateProfileBody } from '@/lib/api';
import type { Me } from '@/lib/schemas/me';

import { ME_QUERY_KEY } from './useMe';

/**
 * `PATCH /api/v1/me/profile` 뮤테이션.
 *
 * onSuccess 시 서버 응답으로 `['me']` 캐시를 즉시 갱신하고,
 * 추가로 invalidate 해 후속 화면(피드 "내 암장" 필터 등)이 freshest 상태를 사용하도록 한다.
 *
 * Phase 1 정책:
 *   - 단일 사용자 시점이므로 낙관 갱신은 도입하지 않는다 (응답 후 갱신만으로 충분).
 *   - 주 암장 변경은 `mainGymExtId`, 해제는 `clearMainGym: true` 로 전달
 *     (PR #59 contract — `UpdateProfileBody` 참조).
 */
export function useUpdateProfileMutation(accessToken: string | null) {
  const qc = useQueryClient();

  return useMutation<Me, Error, UpdateProfileBody>({
    mutationFn: (body) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return updateMyProfile(accessToken, body);
    },
    onSuccess: (data) => {
      // 서버 응답을 캐시에 즉시 반영 — UI flicker 최소화.
      qc.setQueryData<Me>(ME_QUERY_KEY, data);
      // 다른 me 종속 쿼리(피드 my-gym 필터 등)도 함께 갱신.
      void qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}
