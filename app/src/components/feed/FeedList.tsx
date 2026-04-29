import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
  type ListRenderItem,
} from 'react-native';

import type { FeedFilter, FeedItem } from '@/lib/schemas/feed';
import { useTokens } from '@/lib/useTokens';

import { FeedEmptyState } from './FeedEmptyState';
import { FeedPostCard } from './FeedPostCard';
import { makeFeedStyles } from './feedScreenStyles';

type FeedListProps = {
  items: FeedItem[];
  accessToken: string;
  filter: FeedFilter;
  isRefetching: boolean;
  isFetchingNextPage: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  onCommentPress: (postExtId: string) => void;
};

export function FeedList({
  items,
  accessToken,
  filter,
  isRefetching,
  isFetchingNextPage,
  onRefresh,
  onEndReached,
  onCommentPress,
}: FeedListProps): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeFeedStyles(theme), [theme]);

  const renderItem: ListRenderItem<FeedItem> = ({ item }) => (
    <View style={styles.cardWrap}>
      <FeedPostCard
        item={item}
        accessToken={accessToken}
        onCommentPress={onCommentPress}
      />
    </View>
  );

  return (
    <FlatList
      style={styles.list}
      data={items}
      keyExtractor={(item) => item.extId}
      renderItem={renderItem}
      contentContainerStyle={
        items.length === 0
          ? styles.emptyListContent
          : styles.listContent
      }
      ListEmptyComponent={<FeedEmptyState filter={filter} />}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator color={theme.accent.base} />
          </View>
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          tintColor={theme.accent.base}
        />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
    />
  );
}
