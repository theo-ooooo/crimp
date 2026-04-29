import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useMeQuery } from '@/hooks/queries/useMe';
import { useMeStatsQuery } from '@/hooks/queries/useMeStats';
import { useUpdateProfile } from '@/hooks/queries/useUpdateProfile';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import type { GymItem } from '@/lib/schemas/gym';

export function useProfileScreen(accessToken: string) {
  const meQuery = useMeQuery(accessToken);
  const statsQuery = useMeStatsQuery(accessToken);
  const updateMutation = useUpdateProfile(accessToken);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);

  const me = meQuery.data;
  const mainGym = me?.mainGym ?? null;
  const hasMainGym = mainGym !== null && mainGym !== undefined;

  const onPickerSelect = useCallback(
    (gym: GymItem) => {
      updateMutation.mutate(
        { mainGymExtId: gym.extId },
        {
          onSuccess: () => setPickerOpen(false),
          onError: (err) => {
            Alert.alert(t('profile.errorTitle'), toUserMessage(err));
          },
        },
      );
    },
    [updateMutation],
  );

  const onClearMainGym = useCallback(() => {
    Alert.alert(
      t('me.mainGym.clearConfirmTitle'),
      t('me.mainGym.clearConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('me.mainGym.clearCta'),
          style: 'destructive',
          onPress: () => updateMutation.mutate({ clearMainGym: true }),
        },
      ],
    );
  }, [updateMutation]);

  const onRefresh = useCallback(() => {
    meQuery.refetch().catch(() => {});
    statsQuery.refetch().catch(() => {});
  }, [meQuery, statsQuery]);

  return {
    meQuery,
    statsQuery,
    updateMutation,
    pickerOpen,
    setPickerOpen,
    mainGym,
    hasMainGym,
    onPickerSelect,
    onClearMainGym,
    onRefresh,
  };
}
