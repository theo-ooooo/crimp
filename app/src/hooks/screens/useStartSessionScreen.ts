import { useEffect, useState } from 'react';
import type { RouteProp } from '@react-navigation/native';

import { useStartSession } from '@/hooks/queries/useSessions';
import type { RootStackNavigationProp, RootStackParamList } from '@/navigation/types';

export function useStartSessionScreen(
  accessToken: string | null,
  route: RouteProp<RootStackParamList, 'StartSession'>,
  navigation: RootStackNavigationProp<'StartSession'>,
) {
  const mutation = useStartSession(accessToken);

  const selectedGymExtId = route.params?.gymExtId ?? null;
  const selectedGymName = route.params?.gymName ?? null;
  const hasSelectedGym = Boolean(selectedGymExtId);

  const [gymName, setGymName] = useState<string>(selectedGymName ?? '');

  useEffect(() => {
    if (selectedGymName) {
      setGymName(selectedGymName);
    }
  }, [selectedGymName]);

  const clearSelectedGym = () => {
    navigation.setParams({ gymExtId: undefined, gymName: undefined });
  };

  const onSubmit = () => {
    mutation.mutate(
      {
        gymExtId: selectedGymExtId ?? null,
        gymNameRaw: gymName.trim() ? gymName.trim() : null,
        startedAt: new Date().toISOString(),
      },
      {
        onSuccess: (created) => {
          navigation.replace('SessionDetail', { extId: created.extId });
        },
      },
    );
  };

  return {
    mutation,
    selectedGymName,
    hasSelectedGym,
    gymName,
    setGymName,
    clearSelectedGym,
    onSubmit,
  };
}
