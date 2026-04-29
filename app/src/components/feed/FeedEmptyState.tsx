import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import { t } from '@/lib/i18n';
import type { FeedFilter } from '@/lib/schemas/feed';
import { useTokens } from '@/lib/useTokens';

import { makeFeedEmptyStyles } from './feedScreenStyles';

type FeedEmptyStateProps = {
  filter: FeedFilter;
};

export function FeedEmptyState({ filter }: FeedEmptyStateProps): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeFeedEmptyStyles(theme), [theme]);

  const titleKey =
    filter === 'friends'
      ? 'feed.empty.friends.title'
      : filter === 'my-gym'
        ? 'feed.empty.myGym.title'
        : 'feed.empty.popular.title';
  const bodyKey =
    filter === 'friends'
      ? 'feed.empty.friends.body'
      : filter === 'my-gym'
        ? 'feed.empty.myGym.body'
        : 'feed.empty.popular.body';

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t(titleKey)}</Text>
      <Text style={styles.body}>{t(bodyKey)}</Text>
    </View>
  );
}
