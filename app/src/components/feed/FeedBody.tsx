import React from 'react';

import type { FeedFilter, FeedItem } from '@/lib/schemas/feed';

import { FeedErrorState } from './FeedErrorState';
import { FeedList } from './FeedList';
import { FeedSkeletonList } from './FeedSkeletonList';

type FeedBodyProps = {
  isLoading: boolean;
  error: Error | null;
  items: FeedItem[];
  accessToken: string;
  filter: FeedFilter;
  isRefetching: boolean;
  isFetchingNextPage: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  onCommentPress: (postExtId: string) => void;
};

export function FeedBody({
  isLoading,
  error,
  items,
  accessToken,
  filter,
  isRefetching,
  isFetchingNextPage,
  onRefresh,
  onEndReached,
  onCommentPress,
}: FeedBodyProps): JSX.Element {
  if (isLoading) {
    return <FeedSkeletonList />;
  }

  if (error) {
    return <FeedErrorState error={error} onRetry={onRefresh} />;
  }

  return (
    <FeedList
      items={items}
      accessToken={accessToken}
      filter={filter}
      isRefetching={isRefetching}
      isFetchingNextPage={isFetchingNextPage}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onCommentPress={onCommentPress}
    />
  );
}
