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
  const [clearConfirmOpen, setClearConfirmOpen] = useState<boolean>(false);
  const [clearErrorMessage, setClearErrorMessage] = useState<string | null>(null);

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
    setClearErrorMessage(null);
    setClearConfirmOpen(true);
  }, []);

  const onCancelClearMainGym = useCallback(() => {
    if (updateMutation.isPending) {
      return;
    }
    setClearErrorMessage(null);
    setClearConfirmOpen(false);
  }, [updateMutation.isPending]);

  const onConfirmClearMainGym = useCallback(() => {
    setClearErrorMessage(null);
    updateMutation.mutate(
      { clearMainGym: true },
      {
        onSuccess: () => setClearConfirmOpen(false),
        onError: (err) => setClearErrorMessage(toUserMessage(err)),
      },
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
    clearConfirmOpen,
    clearErrorMessage,
    mainGym,
    hasMainGym,
    onPickerSelect,
    onClearMainGym,
    onCancelClearMainGym,
    onConfirmClearMainGym,
    onRefresh,
  };
}
