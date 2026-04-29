import React, { useCallback } from 'react';
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
} from 'react-native';

import { Chip, CrimpIcon, Skeleton } from '@/components/common/primitives';
import { makeGymSearchStyles } from '@/components/gym/gymSearchStyles';
import { GymSearchCard } from '@/components/gym-search/GymSearchCard';
import { GymSearchEmptyState } from '@/components/gym-search/GymSearchEmptyState';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import { radius, space } from '@/lib/tokens';
import type { GymItem } from '@/lib/schemas/gym';
import type { RootStackNavigationProp } from '@/navigation/types';

type Props = {
  styles: ReturnType<typeof makeGymSearchStyles>;
  bgColor: string;
  text3Color: string;
  text4Color: string;
  accentColor: string;
  searchText: string;
  setSearchText: (value: string) => void;
  brand: string;
  setBrand: (value: string) => void;
  brandOptions: ReadonlyArray<{ key: string; labelKey: 'gym.list.brandAllLabel' | null }>;
  gyms: GymItem[];
  isLoading: boolean;
  error: Error | null;
  isRefetching: boolean;
  isFetchingNextPage: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  navigation: RootStackNavigationProp<'GymSearch'>;
};

export function GymSearchBody({
  styles,
  bgColor,
  text3Color,
  text4Color,
  accentColor,
  searchText,
  setSearchText,
  brand,
  setBrand,
  brandOptions,
  gyms,
  isLoading,
  error,
  isRefetching,
  isFetchingNextPage,
  onRefresh,
  onEndReached,
  navigation,
}: Props): JSX.Element {
  const renderItem = useCallback<ListRenderItem<GymItem>>(
    ({ item }) => (
      <GymSearchCard
        gym={item}
        onPress={() => navigation.navigate('GymDetail', { extId: item.extId })}
      />
    ),
    [navigation],
  );

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.searchWrap}>
        <View style={styles.searchField}>
          <CrimpIcon.search size={20} color={text3Color} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder={t('gym.list.searchPlaceholder')}
            placeholderTextColor={text4Color}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel={t('gym.list.searchAccessibilityLabel')}
          />
          {searchText.length > 0 && Platform.OS !== 'ios' ? (
            <Pressable
              onPress={() => setSearchText('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('gym.list.searchClearLabel')}
              style={styles.searchClear}
            >
              <CrimpIcon.close size={18} color={text3Color} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
        accessibilityLabel={t('gym.list.brandFilterLabel')}
      >
        {brandOptions.map((opt) => (
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
          <View style={itemSeparatorStyles.gap} />
          <Skeleton height={84} radius={radius.lg} />
          <View style={itemSeparatorStyles.gap} />
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
            gyms.length === 0 ? [styles.flexContent, styles.content] : styles.content
          }
          ItemSeparatorComponent={ItemSeparator}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={accentColor}
            />
          }
          ListEmptyComponent={<GymSearchEmptyState />}
          renderItem={renderItem}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator color={accentColor} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

function ItemSeparator(): JSX.Element {
  return <View style={itemSeparatorStyles.gap} />;
}

const itemSeparatorStyles = StyleSheet.create({
  gap: { height: space[2] },
});
