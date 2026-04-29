import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
  type ListRenderItem,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { BigStat, Skeleton } from '@/components/common/primitives';
import { t } from '@/lib/i18n';
import { useTokens } from '@/lib/useTokens';
import type { RootStackNavigationProp } from '@/navigation/types';
import type { Session } from '@/lib/schemas/session';

import { SessionListCard } from './SessionListCard';
import { SessionListEmptyState } from './SessionListEmptyState';
import { makeSessionListStyles } from './sessionListStyles';
import { countThisWeek } from './sessionListUtils';

type Props = {
  sessions: Session[];
  isRefetching: boolean;
  isFetchingNextPage: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
};

function ItemSeparator(): JSX.Element {
  return <View style={{ height: 8 }} />;
}

export function SessionListBody({
  sessions,
  isRefetching,
  isFetchingNextPage,
  onRefresh,
  onEndReached,
}: Props): JSX.Element {
  const theme = useTokens();
  const navigation = useNavigation<RootStackNavigationProp<'SessionList'>>();
  const styles = useMemo(() => makeSessionListStyles(theme), [theme]);
  const weeklyCount = countThisWeek(sessions);

  const renderItem: ListRenderItem<Session> = ({ item }) => (
    <SessionListCard
      session={item}
      onPress={() => navigation.navigate('SessionDetail', { extId: item.extId })}
    />
  );

  return (
    <FlatList
      data={sessions}
      keyExtractor={(item) => item.extId}
      contentContainerStyle={
        sessions.length === 0
          ? [styles.flexContent, styles.content]
          : styles.content
      }
      ListHeaderComponent={
        sessions.length > 0 ? (
          <View style={styles.summaryCard}>
            <BigStat
              value={weeklyCount}
              unit={t('session.list.weeklyCountUnit')}
              label={t('session.list.weeklyCountLabel')}
              scale="md"
              accent={theme.accent.base}
            />
          </View>
        ) : null
      }
      ItemSeparatorComponent={ItemSeparator}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          tintColor={theme.accent.base}
        />
      }
      ListEmptyComponent={
        <SessionListEmptyState onStart={() => navigation.navigate('StartSession')} />
      }
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
  );
}

export function SessionListLoading(): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeSessionListStyles(theme), [theme]);
  return (
    <View style={styles.content}>
      <Skeleton height={96} radius={20} />
      <View style={{ height: 12 }} />
      <Skeleton height={84} radius={16} />
      <View style={{ height: 8 }} />
      <Skeleton height={84} radius={16} />
    </View>
  );
}
