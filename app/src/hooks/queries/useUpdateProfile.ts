import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateMyProfile } from '@/lib/api';
import type { Me, UpdateProfileBody } from '@/lib/schemas/me';

import { FEED_QUERY_KEY_ROOT } from './useFeed';
import { ME_QUERY_KEY } from './useMe';

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
      qc.invalidateQueries({ queryKey: FEED_QUERY_KEY_ROOT });
    },
  });
}
