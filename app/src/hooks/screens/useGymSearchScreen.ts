import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useGymsQuery } from '@/hooks/queries/useGyms';
import type { GymItem } from '@/lib/schemas/gym';

export const GYM_BRAND_OPTIONS = [
  { key: '', labelKey: 'gym.list.brandAllLabel' as const },
  { key: '클라임파크', labelKey: null },
  { key: '더클라이밍', labelKey: null },
  { key: '볼더스', labelKey: null },
  { key: '락트리퍼', labelKey: null },
] as const;

const SEARCH_DEBOUNCE_MS = 300;

export function useGymSearchScreen() {
  const [searchText, setSearchText] = useState<string>('');
  const [debouncedQ, setDebouncedQ] = useState<string>('');
  const [brand, setBrand] = useState<string>('');

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
    () => ({
      q: debouncedQ.length > 0 ? debouncedQ : undefined,
      brand: brand.length > 0 ? brand : undefined,
    }),
    [debouncedQ, brand],
  );

  const query = useGymsQuery(filters);

  const onRefresh = useCallback(() => {
    query.refetch().catch(() => {
      /* error 상태로 노출 */
    });
  }, [query]);

  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage().catch(() => {
        /* 페이지 실패 무시 */
      });
    }
  }, [query]);

  const gyms: GymItem[] = query.data?.pages.flatMap((p) => p.items) ?? [];

  return {
    searchText,
    setSearchText,
    brand,
    setBrand,
    gyms,
    error: query.error ?? null,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isFetchingNextPage: query.isFetchingNextPage,
    onRefresh,
    onEndReached,
  };
}
