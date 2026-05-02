import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RouteProp } from '@react-navigation/native';

import { useGymsQuery } from '@/hooks/queries/useGyms';
import { useMeQuery } from '@/hooks/queries/useMe';
import { useStartSession } from '@/hooks/queries/useSessions';
import type { GymItem } from '@/lib/schemas/gym';
import type { RootStackNavigationProp, RootStackParamList } from '@/navigation/types';

const SEARCH_DEBOUNCE_MS = 300;

export type StartSessionGymChoice = {
  extId: string;
  name: string;
  brand?: string | null;
  address?: string | null;
};

export function useStartSessionScreen(
  accessToken: string | null,
  route: RouteProp<RootStackParamList, 'StartSession'>,
  navigation: RootStackNavigationProp<'StartSession'>,
) {
  const mutation = useStartSession(accessToken);
  const meQuery = useMeQuery(accessToken);

  const selectedGymExtId = route.params?.gymExtId ?? null;
  const selectedGymName = route.params?.gymName ?? null;
  const routeGym = useMemo<StartSessionGymChoice | null>(
    () =>
      selectedGymExtId && selectedGymName
        ? { extId: selectedGymExtId, name: selectedGymName }
        : null,
    [selectedGymExtId, selectedGymName],
  );
  const mainGym = useMemo<StartSessionGymChoice | null>(
    () =>
      meQuery.data?.mainGym
        ? {
            extId: meQuery.data.mainGym.extId,
            name: meQuery.data.mainGym.name,
            brand: meQuery.data.mainGym.brand ?? null,
          }
        : null,
    [meQuery.data?.mainGym],
  );

  const [searchMode, setSearchMode] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [debouncedQ, setDebouncedQ] = useState<string>('');
  const [pickedGym, setPickedGym] = useState<StartSessionGymChoice | null>(null);

  useEffect(() => {
    if (routeGym) {
      setSearchMode(false);
      setPickedGym(routeGym);
    }
  }, [routeGym]);

  useEffect(() => {
    if (!routeGym && !mainGym && !pickedGym && meQuery.isFetched) {
      setSearchMode(true);
    }
  }, [mainGym, meQuery.isFetched, pickedGym, routeGym]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const nextQ = searchText.trim();
    if (nextQ === debouncedQ) {
      return;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setDebouncedQ(nextQ);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [debouncedQ, searchText]);

  const filters = useMemo(
    () => ({ q: debouncedQ.length > 0 ? debouncedQ : undefined }),
    [debouncedQ],
  );
  const gymQuery = useGymsQuery(filters, 20);
  const gyms: GymItem[] = useMemo(
    () => gymQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [gymQuery.data],
  );

  const activeGym = pickedGym ?? (!searchMode ? mainGym : null);
  const canSubmit = Boolean(activeGym) && !mutation.isPending;

  const clearSelectedGym = () => {
    navigation.setParams({ gymExtId: undefined, gymName: undefined });
    setPickedGym(null);
    setSearchMode(true);
  };

  const useOtherGym = useCallback(() => {
    setSearchMode(true);
    setPickedGym(null);
  }, []);

  const useMainGym = useCallback(() => {
    navigation.setParams({ gymExtId: undefined, gymName: undefined });
    setPickedGym(null);
    setSearchMode(false);
  }, [navigation]);

  const selectGym = useCallback((gym: GymItem) => {
    setPickedGym({
      extId: gym.extId,
      name: gym.name,
      brand: gym.brand,
      address: gym.address,
    });
    setSearchMode(false);
  }, []);

  const onEndReached = useCallback(() => {
    if (gymQuery.hasNextPage && !gymQuery.isFetchingNextPage) {
      gymQuery.fetchNextPage().catch(() => {});
    }
  }, [gymQuery]);

  const refreshGyms = useCallback(() => {
    gymQuery.refetch().catch(() => {});
  }, [gymQuery]);

  const currentGymName = activeGym?.name ?? null;
  const hasSelectedGym = Boolean(activeGym);

  const submitBody = () => {
    if (!activeGym) {
      return null;
    }
    return {
      gymExtId: activeGym.extId,
      gymNameRaw: null,
      startedAt: new Date().toISOString(),
    };
  };

  const onSubmit = () => {
    const body = submitBody();
    if (!body) {
      return;
    }
    mutation.mutate(
      body,
      {
        onSuccess: (created) => {
          navigation.replace('SessionDetail', { extId: created.extId });
        },
      },
    );
  };

  return {
    mutation,
    mainGym,
    activeGym,
    selectedGymName: currentGymName,
    hasSelectedGym,
    searchMode,
    searchText,
    setSearchText,
    gyms,
    gymQuery,
    canSubmit,
    clearSelectedGym,
    useOtherGym,
    useMainGym,
    selectGym,
    onEndReached,
    refreshGyms,
    onSubmit,
  };
}
