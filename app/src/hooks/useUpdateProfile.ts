import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateMyProfile } from '@/lib/api';
import type { Me, UpdateProfileBody } from '@/lib/schemas/me';

import { ME_QUERY_KEY } from './useMe';

/**
 * `PATCH /api/v1/me/profile` 훅 (앱).
 *
 * - 성공 시 `['me']` 쿼리를 invalidate 해서 HomeScreen·ProfileScreen 의 표시값을 갱신.
 * - 응답이 갱신된 `Me` 이므로 동기 setQueryData 로 즉시 반영해 invalidate 의 네트워크
 *   왕복을 한 번 절약한다 (그 후 invalidate 로 정합성 한 번 더 확인).
 */
export function useUpdateProfile(accessToken: string | null) {
  const qc = useQueryClient();
  return useMutation<Me, Error, UpdateProfileBody>({
    mutationFn: (body) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return updateMyProfile(accessToken, body);
    },
    onSuccess: (updated) => {
      qc.setQueryData<Me>(ME_QUERY_KEY, updated);
      qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}
