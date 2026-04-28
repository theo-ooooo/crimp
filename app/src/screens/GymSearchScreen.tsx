import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
  type PressableStateCallbackType,
  type ViewStyle,
} from 'react-native';

import { Chip, CrimpIcon, Skeleton } from '@/components/primitives';
import { useGymsQuery } from '@/hooks/useGyms';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  shadow,
  space,
  withAlpha,
  type Theme,
} from '@/lib/tokens';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTokens } from '@/lib/useTokens';
import type { GymItem } from '@/lib/schemas/gym';
import type { RootStackNavigationProp } from '@/navigation/types';

/**
 * 암장 검색·목록 화면.
 *
 * - 상단 header: h1 "암장 찾기"
 * - TextInput (300ms debounce) + 브랜드 Chip row
 * - FlatList + RefreshControl + onEndReached 커서 페이지네이션
 * - Skeleton / errorBox / empty state
 */

// 국내 대표 브랜드 (하드코딩 — 향후 `/api/v1/gyms/brands` 같은 엔드포인트로 대체 가능)
const BRAND_OPTIONS = [
  { key: '', labelKey: 'gym.list.brandAllLabel' as const },
  { key: '클라임파크', labelKey: null },
  { key: '더클라이밍', labelKey: null },
  { key: '볼더스', labelKey: null },
  { key: '락트리퍼', labelKey: null },
] as const;

const SEARCH_DEBOUNCE_MS = 300;

export default function GymSearchScreen(): JSX.Element {
  const theme = useTokens();
  const navigation = useNavigation<RootStackNavigationProp<'GymSearch'>>();

  const [searchText, setSearchText] = useState<string>('');
  const [debouncedQ, setDebouncedQ] = useState<string>('');
  const [brand, setBrand] = useState<string>('');

  // 입력 변경 시 300ms 뒤 debouncedQ 를 갱신해 React Query 캐시를 재사용하도록 한다.
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

  const {
    data,
    error,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGymsQuery(filters);

  const styles = useMemo(() => makeStyles(theme), [theme]);

  const onRefresh = useCallback(() => {
    refetch().catch(() => {
      /* error 상태로 노출 */
    });
  }, [refetch]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage().catch(() => {
        /* 페이지 실패 무시 */
      });
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const gyms: GymItem[] = data?.pages.flatMap((p) => p.items) ?? [];

  // I1: useCallback + React.memo 로 FlatList row 재렌더 억제.
  const renderItem = useCallback<ListRenderItem<GymItem>>(
    ({ item }) => (
      <GymCard
        gym={item}
        onPress={() => navigation.navigate('GymDetail', { extId: item.extId })}
      />
    ),
    [navigation],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* 본문 상단 타이틀은 CrimpHeader (네비 헤더) 가 표시 — 중복 제거. */}

      {/* 검색 입력 */}
      <View style={styles.searchWrap}>
        <View style={styles.searchField}>
          <CrimpIcon.search size={20} color={theme.text3} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder={t('gym.list.searchPlaceholder')}
            placeholderTextColor={theme.text4}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing" // iOS 네이티브 clear 버튼
            accessibilityLabel={t('gym.list.searchAccessibilityLabel')}
          />
          {/* Android / 웹RN 은 clearButtonMode 가 무시되므로 값이 있을 때만 수동 버튼 렌더 */}
          {searchText.length > 0 && Platform.OS !== 'ios' ? (
            <Pressable
              onPress={() => setSearchText('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('gym.list.searchClearLabel')}
              style={styles.searchClear}
            >
              <CrimpIcon.close size={18} color={theme.text3} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* 브랜드 필터 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
        accessibilityLabel={t('gym.list.brandFilterLabel')}
      >
        {BRAND_OPTIONS.map((opt) => (
          <Chip
            key={opt.key || '__all__'}
            label={opt.labelKey ? t(opt.labelKey) : opt.key}
            active={brand === opt.key}
            onPress={() => setBrand(opt.key)}
          />
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.content}>
          <Skeleton height={84} radius={radius.lg} />
          <View style={{ height: space[2] }} />
          <Skeleton height={84} radius={radius.lg} />
          <View style={{ height: space[2] }} />
          <Skeleton height={84} radius={radius.lg} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t('gym.list.errorTitle')}</Text>
          <Text style={styles.errorBody}>{toUserMessage(error)}</Text>
        </View>
      ) : (
        <FlatList
          data={gyms}
          keyExtractor={(item) => item.extId}
          contentContainerStyle={
            gyms.length === 0
              ? [styles.flexContent, styles.content]
              : styles.content
          }
          ItemSeparatorComponent={ItemSeparator}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={theme.accent.base}
            />
          }
          ListEmptyComponent={<EmptyState />}
          renderItem={renderItem}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator color={theme.accent.base} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

// I1: React.memo 로 gym·onPress 가 같으면 재렌더 방지.
const GymCard = React.memo(function GymCard({
  gym,
  onPress,
}: {
  gym: GymItem;
  onPress: () => void;
}): JSX.Element {
  const theme = useTokens();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeCardStyles(theme), [theme]);

  // I2: brand/address 포함해 스크린리더가 카드를 한 번에 설명할 수 있도록.
  const a11yParts: string[] = [gym.name];
  if (gym.brand) {
    a11yParts.push(gym.brand);
  }
  if (gym.address) {
    a11yParts.push(gym.address);
  }
  const accessibilityLabel = a11yParts.join(', ');

  const renderContent = ({ pressed }: PressableStateCallbackType) => {
    const pressedStyle: ViewStyle | null =
      pressed && !reducedMotion ? styles.pressed : null;
    return (
      <View style={[styles.card, pressedStyle]}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {gym.name}
          </Text>
          <Text style={styles.brand} numberOfLines={1}>
            {gym.brand ?? t('gym.list.brandFallback')}
          </Text>
        </View>
        <Text style={styles.address} numberOfLines={2}>
          {gym.address ?? t('gym.list.addressFallback')}
        </Text>
      </View>
    );
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {renderContent}
    </Pressable>
  );
});

function EmptyState(): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeEmptyStyles(theme), [theme]);
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <CrimpIcon.search size={40} color={theme.text3} />
      </View>
      <Text style={styles.title}>{t('gym.list.emptyTitle')}</Text>
      <Text style={styles.body}>{t('gym.list.emptyBody')}</Text>
    </View>
  );
}

function ItemSeparator(): JSX.Element {
  return <View style={itemSeparatorStyles.gap} />;
}

const itemSeparatorStyles = StyleSheet.create({
  gap: { height: space[2] },
});

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingHorizontal: space[5],
      paddingTop: space[5],
      paddingBottom: space[3],
    },
    title: {
      fontFamily,
      fontSize: fontSize.h1,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: letterSpacing.h1,
    },
    searchWrap: {
      paddingHorizontal: space[5],
      paddingBottom: space[3],
    },
    searchField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      backgroundColor: theme.subtle,
      borderRadius: radius.lg,
      paddingHorizontal: space[4],
      paddingVertical: space[3],
    },
    searchInput: {
      flex: 1,
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      color: theme.text,
      letterSpacing: -0.15,
      padding: 0,
    },
    searchClear: {
      padding: space[1],
    },
    chipScroll: {
      flexGrow: 0,
      flexShrink: 0,
    },
    chipRow: {
      paddingHorizontal: space[5],
      paddingBottom: space[3],
      gap: space[2],
      flexDirection: 'row',
    },
    content: {
      paddingHorizontal: space[5],
      paddingBottom: space[10],
    },
    flexContent: {
      flexGrow: 1,
    },
    errorBox: {
      marginHorizontal: space[5],
      backgroundColor: withAlpha(theme.semantic.danger, 0.08),
      borderRadius: radius.lg,
      padding: space[4],
      gap: space[1],
    },
    errorTitle: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
    },
    errorBody: {
      fontFamily,
      fontSize: 13,
      color: theme.text2,
    },
    footer: {
      paddingVertical: space[4],
      alignItems: 'center',
    },
  });
}

function makeCardStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      padding: space[4],
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
      gap: space[2],
      ...shadow.xs,
    },
    pressed: {
      opacity: 0.85,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: space[2],
    },
    name: {
      flex: 1,
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: letterSpacing.title,
    },
    brand: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: theme.accent.ink,
    },
    address: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.medium,
      color: theme.text3,
    },
  });
}

function makeEmptyStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space[6],
      gap: space[2],
    },
    iconCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: theme.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space[2],
    },
    title: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: letterSpacing.title,
      textAlign: 'center',
    },
    body: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.medium,
      color: theme.text3,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 280,
    },
  });
}
