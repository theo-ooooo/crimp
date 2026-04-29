import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import { togglePostLike } from '@/lib/api';
import type { FeedItem, FeedList, LikeToggleResponse } from '@/lib/schemas/feed';

import { FEED_QUERY_KEY_ROOT } from './useFeed';

type LikeToggleVariables = {
  postExtId: string;
  next: boolean;
};

type LikeToggleContext = {
  snapshots: Array<{
    key: ReadonlyArray<unknown>;
    data: InfiniteData<FeedList, number | null> | undefined;
  }>;
};

function patchFeedItem(
  data: InfiniteData<FeedList, number | null> | undefined,
  extId: string,
  patch: (item: FeedItem) => FeedItem,
): InfiniteData<FeedList, number | null> | undefined {
  if (!data) {return data;}
  let touched = false;
  const nextPages = data.pages.map((page) => {
    let pageTouched = false;
    const nextItems = page.items.map((item) => {
      if (item.extId !== extId) {return item;}
      pageTouched = true;
      return patch(item);
    });
    if (!pageTouched) {return page;}
    touched = true;
    return { ...page, items: nextItems };
  });
  if (!touched) {return data;}
  return { ...data, pages: nextPages };
}

export function useLikeToggleMutation(accessToken: string | null) {
  const qc = useQueryClient();

  return useMutation<
    LikeToggleResponse,
    Error,
    LikeToggleVariables,
    LikeToggleContext
  >({
    mutationFn: ({ postExtId, next }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return togglePostLike(
        accessToken,
        postExtId,
        next ? 'like' : 'unlike',
      );
    },
    onMutate: async ({ postExtId, next }) => {
      await qc.cancelQueries({ queryKey: FEED_QUERY_KEY_ROOT });

      const queries = qc.getQueriesData<InfiniteData<FeedList, number | null>>({
        queryKey: FEED_QUERY_KEY_ROOT,
      });
      const snapshots: LikeToggleContext['snapshots'] = queries.map(
        ([key, data]) => ({ key, data }),
      );

      for (const [key, data] of queries) {
        const patched = patchFeedItem(data, postExtId, (item) => {
          if (item.liked === next) {return item;}
          const delta = next ? 1 : -1;
          const nextLikes = Math.max(0, item.likes + delta);
          return { ...item, liked: next, likes: nextLikes };
        });
        if (patched !== data) {
          qc.setQueryData(key, patched);
        }
      }

      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) {return;}
      for (const { key, data } of ctx.snapshots) {
        qc.setQueryData(key, data);
      }
    },
    onSuccess: (resp, { postExtId }) => {
      const queries = qc.getQueriesData<InfiniteData<FeedList, number | null>>({
        queryKey: FEED_QUERY_KEY_ROOT,
      });
      for (const [key, data] of queries) {
        const patched = patchFeedItem(data, postExtId, (item) => ({
          ...item,
          liked: resp.liked,
          likes: resp.likeCount,
        }));
        if (patched !== data) {
          qc.setQueryData(key, patched);
        }
      }
    },
  });
}
