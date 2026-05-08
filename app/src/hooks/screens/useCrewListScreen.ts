import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCrewsQuery } from '@/hooks/queries/useCrews';
import type { CrewLevelBand, CrewStyle, CrewItem } from '@/lib/schemas/crew';

const SEARCH_DEBOUNCE_MS = 300;

export const CREW_LEVEL_OPTIONS: Array<{ key: CrewLevelBand; labelKey: string }> = [
  { key: 'ALL', labelKey: 'crew.level.ALL' },
  { key: 'BEGINNER', labelKey: 'crew.level.BEGINNER' },
  { key: 'INTERMEDIATE', labelKey: 'crew.level.INTERMEDIATE' },
  { key: 'ADVANCED', labelKey: 'crew.level.ADVANCED' },
];

export const CREW_STYLE_OPTIONS: Array<{ key: CrewStyle; labelKey: string }> = [
  { key: 'BOULDERING', labelKey: 'crew.style.BOULDERING' },
  { key: 'LEAD', labelKey: 'crew.style.LEAD' },
  { key: 'BOTH', labelKey: 'crew.style.BOTH' },
];

export function useCrewListScreen(accessToken: string | null) {
  const [searchText, setSearchText] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [region, setRegion] = useState('');
  const [levelBand, setLevelBand] = useState<CrewLevelBand | null>(null);
  const [style, setStyle] = useState<CrewStyle | null>(null);

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
      region: region.trim().length > 0 ? region.trim() : undefined,
      levelBand: levelBand ?? undefined,
      style: style ?? undefined,
    }),
    [debouncedQ, levelBand, region, style],
  );

  const query = useCrewsQuery(accessToken, filters, 20);
  const crews: CrewItem[] = query.data?.pages.flatMap((p) => p.items) ?? [];

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

  return {
    searchText,
    setSearchText,
    region,
    setRegion,
    levelBand,
    setLevelBand,
    style,
    setStyle,
    crews,
    error: query.error ?? null,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isFetchingNextPage: query.isFetchingNextPage,
    onRefresh,
    onEndReached,
  };
}
