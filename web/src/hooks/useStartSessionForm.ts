'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  StartSessionGymChoice,
  StartSessionViewProps,
} from '@/components/sessions/start/types';
import { useGymsQuery } from '@/hooks/useGyms';
import { useMeQuery } from '@/hooks/useMe';
import { useStartSession } from '@/hooks/useSessions';
import { localInputToIso, toLocalInputValue } from '@/lib/datetime';
import type { GymItem } from '@/lib/schemas/gym';

const SEARCH_DEBOUNCE_MS = 300;

export function useStartSessionForm(
  accessToken: string | null,
  routeGym: StartSessionGymChoice | null,
): StartSessionViewProps {
  const router = useRouter();
  const mutation = useStartSession(accessToken);
  const meQuery = useMeQuery(accessToken);
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

  const [searchMode, setSearchMode] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [pickedGym, setPickedGym] = useState<StartSessionGymChoice | null>(null);
  const [startedAtLocal, setStartedAtLocal] = useState(() =>
    toLocalInputValue(new Date()),
  );

  useEffect(() => {
    if (!routeGym) return;
    setPickedGym(routeGym);
    setSearchMode(false);
  }, [routeGym]);

  useEffect(() => {
    if (!routeGym && !mainGym && !pickedGym && meQuery.isFetched) {
      setSearchMode(true);
    }
  }, [mainGym, meQuery.isFetched, pickedGym, routeGym]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const nextQ = searchText.trim();
    if (nextQ === debouncedQ) return;
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

  const gymQuery = useGymsQuery(
    { q: debouncedQ.length > 0 ? debouncedQ : null, brand: null },
    20,
  );
  const gyms: GymItem[] = useMemo(
    () => gymQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [gymQuery.data],
  );
  const activeGym = pickedGym ?? (!searchMode ? mainGym : null);

  const clearRouteGym = useCallback(() => {
    router.replace('/sessions/new');
  }, [router]);

  const onUseOtherGym = useCallback(() => {
    clearRouteGym();
    setPickedGym(null);
    setSearchMode(true);
  }, [clearRouteGym]);

  const onUseMainGym = useCallback(() => {
    clearRouteGym();
    setPickedGym(null);
    setSearchMode(false);
  }, [clearRouteGym]);

  const onClearSelectedGym = useCallback(() => {
    clearRouteGym();
    setPickedGym(null);
    setSearchMode(true);
  }, [clearRouteGym]);

  const onSelectGym = useCallback((gym: GymItem) => {
    setPickedGym({
      extId: gym.extId,
      name: gym.name,
      brand: gym.brand,
      address: gym.address,
    });
    setSearchMode(false);
  }, []);

  const onLoadMore = useCallback(() => {
    if (gymQuery.hasNextPage && !gymQuery.isFetchingNextPage) {
      gymQuery.fetchNextPage().catch(() => {});
    }
  }, [gymQuery]);

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!activeGym) return;
      mutation.mutate(
        {
          gymExtId: activeGym.extId,
          gymNameRaw: null,
          startedAt: localInputToIso(startedAtLocal),
        },
        {
          onSuccess: (created) => {
            router.push(`/sessions/${encodeURIComponent(created.extId)}`);
          },
        },
      );
    },
    [activeGym, mutation, router, startedAtLocal],
  );

  return {
    gymChoice: {
      mainGym,
      activeGym,
      mode: !searchMode && activeGym ? 'selected' : 'search',
    },
    gymSearch: {
      searchText,
      gyms,
      isLoading: gymQuery.isLoading,
      isFetchingNext: gymQuery.isFetchingNextPage,
      error: gymQuery.error ?? null,
      hasMore: Boolean(gymQuery.hasNextPage),
    },
    gymActions: {
      onSearchTextChange: setSearchText,
      onUseOtherGym,
      onUseMainGym,
      onClearSelectedGym,
      onSelectGym,
      onLoadMore,
    },
    submit: {
      canSubmit: Boolean(activeGym) && !mutation.isPending,
      isPending: mutation.isPending,
      error: mutation.error ?? null,
      onSubmit,
    },
    startedAtLocal,
    onStartedAtChange: setStartedAtLocal,
  };
}
