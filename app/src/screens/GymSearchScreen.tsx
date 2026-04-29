import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';

import { makeGymSearchStyles } from '@/components/gym/gymSearchStyles';
import { GymSearchBody } from '@/components/gym-search/GymSearchBody';
import { GYM_BRAND_OPTIONS, useGymSearchScreen } from '@/hooks/screens/useGymSearchScreen';
import { useTokens } from '@/lib/useTokens';
import type { RootStackNavigationProp } from '@/navigation/types';

/**
 * 암장 검색·목록 화면.
 *
 * - 상단 header: h1 "암장 찾기"
 * - TextInput (300ms debounce) + 브랜드 Chip row
 * - FlatList + RefreshControl + onEndReached 커서 페이지네이션
 * - Skeleton / errorBox / empty state
 */

export default function GymSearchScreen(): JSX.Element {
  const theme = useTokens();
  const navigation = useNavigation<RootStackNavigationProp<'GymSearch'>>();
  const {
    searchText,
    setSearchText,
    brand,
    setBrand,
    gyms,
    error,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    onRefresh,
    onEndReached,
  } = useGymSearchScreen();
  const styles = useMemo(() => makeGymSearchStyles(theme), [theme]);

  return (
    <GymSearchBody
      styles={styles}
      bgColor={theme.bg}
      text3Color={theme.text3}
      text4Color={theme.text4}
      accentColor={theme.accent.base}
      searchText={searchText}
      setSearchText={setSearchText}
      brand={brand}
      setBrand={setBrand}
      brandOptions={GYM_BRAND_OPTIONS}
      gyms={gyms}
      isLoading={isLoading}
      error={error}
      isRefetching={isRefetching}
      isFetchingNextPage={isFetchingNextPage}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      navigation={navigation}
    />
  );
}

