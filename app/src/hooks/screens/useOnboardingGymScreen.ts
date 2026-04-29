import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler } from 'react-native';

import { useGymsQuery } from '@/hooks/queries/useGyms';
import { useUpdateProfile } from '@/hooks/queries/useUpdateProfile';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import type { GymItem } from '@/lib/schemas/gym';
import { useOnboardingStore } from '@/store/onboardingStore';

const SEARCH_DEBOUNCE_MS = 300;

export function useOnboardingGymScreen(accessToken: string | null) {
  const dismiss = useOnboardingStore((s) => s.dismiss);
  const [searchText, setSearchText] = useState<string>('');
  const [debouncedQ, setDebouncedQ] = useState<string>('');
  const [selected, setSelected] = useState<GymItem | null>(null);
  const updateMutation = useUpdateProfile(accessToken);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setDebouncedQ(searchText.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [searchText]);

  const filters = useMemo(
    () => ({ q: debouncedQ.length > 0 ? debouncedQ : undefined }),
    [debouncedQ],
  );
  const {
    data,
    error,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGymsQuery(filters);

  const gyms: GymItem[] = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage().catch(() => {});
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const onConfirm = useCallback(() => {
    if (!selected) {
      return;
    }
    updateMutation.mutate(
      { mainGymExtId: selected.extId },
      {
        onError: (err) => {
          Alert.alert(t('onboarding.mainGym.errorTitle'), toUserMessage(err));
        },
      },
    );
  }, [selected, updateMutation]);

  const onSkip = useCallback(() => {
    dismiss();
  }, [dismiss]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        t('onboarding.mainGym.exitConfirmTitle'),
        t('onboarding.mainGym.exitConfirmBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('onboarding.mainGym.exitConfirmCta'),
            style: 'destructive',
            onPress: () => BackHandler.exitApp(),
          },
        ],
      );
      return true;
    });
    return () => sub.remove();
  }, []);

  const saving = updateMutation.isPending;
  const canConfirm = selected !== null && !saving;

  return {
    searchText,
    setSearchText,
    selected,
    setSelected,
    gyms,
    error: error ?? null,
    isLoading,
    onEndReached,
    onConfirm,
    onSkip,
    saving,
    canConfirm,
  };
}
