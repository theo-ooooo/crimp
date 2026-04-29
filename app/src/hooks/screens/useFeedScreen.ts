import { useCallback, useState } from 'react';

import { useFeedQuery } from '@/hooks/queries/useFeed';
import {
  DEFAULT_FEED_FILTER,
  type FeedFilter,
  type FeedItem,
} from '@/lib/schemas/feed';

type UseFeedScreenResult = {
  filter: FeedFilter;
  setFilter: (next: FeedFilter) => void;
  commentPostExtId: string | null;
  onCommentPress: (postExtId: string) => void;
  onCommentSheetClose: () => void;
  items: FeedItem[];
  error: Error | null;
  isLoading: boolean;
  isRefetching: boolean;
  isFetchingNextPage: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
};

export function useFeedScreen(
  accessToken: string | null,
): UseFeedScreenResult {
  const [filter, setFilter] = useState<FeedFilter>(DEFAULT_FEED_FILTER);
  const [commentPostExtId, setCommentPostExtId] = useState<string | null>(null);

  const {
    data,
    error,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFeedQuery(accessToken, filter);

  const onRefresh = useCallback(() => {
    refetch().catch(() => {
      /* 새로고침 실패는 error 로 노출 */
    });
  }, [refetch]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage().catch(() => {
        /* 페이지 실패 무시 — 다음 시도에서 재시도 */
      });
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const onCommentPress = useCallback((postExtId: string) => {
    setCommentPostExtId(postExtId);
  }, []);

  const onCommentSheetClose = useCallback(() => {
    setCommentPostExtId(null);
  }, []);

  return {
    filter,
    setFilter,
    commentPostExtId,
    onCommentPress,
    onCommentSheetClose,
    items: data?.pages.flatMap((page) => page.items) ?? [],
    error: error ?? null,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    onRefresh,
    onEndReached,
  };
}
