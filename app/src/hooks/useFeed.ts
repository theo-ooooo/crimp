import {
  useInfiniteQuery,
  type InfiniteData,
} from '@tanstack/react-query';

import { fetchFeed } from '@/lib/api';
import type { FeedFilter, FeedList } from '@/lib/schemas/feed';

/**
 * Feed 관련 React Query 훅 (앱).
 *
 * 쿼리키 규약:
 *   - 목록: `['feed', filter]` — 필터별로 캐시를 분리해 탭 전환 시 즉시 캐시 hit 가능.
 *
 * accessToken 은 식별자가 아니므로 queryKey 에 포함하지 않는다 (다른 훅과 동일 규약).
 * 커서는 number(Long) 또는 null.
 */
export const FEED_QUERY_KEY_ROOT = ['feed'] as const;

/**
 * 피드 페이지 크기 — 백엔드 default 와 동일하지만 명시적으로 노출해 호출부 추적성 ↑.
 * 백엔드 (`FeedService.DEFAULT_PAGE_SIZE = 20`) 와 일치. 변경 시 양쪽 모두 갱신.
 */
export const FEED_PAGE_SIZE = 20;

export function feedQueryKey(filter: FeedFilter) {
  return ['feed', filter] as const;
}

export function useFeedQuery(
  accessToken: string | null,
  filter: FeedFilter,
  pageSize: number = FEED_PAGE_SIZE,
) {
  return useInfiniteQuery<
    FeedList,
    Error,
    InfiniteData<FeedList, number | null>,
    ReturnType<typeof feedQueryKey>,
    number | null
  >({
    queryKey: feedQueryKey(filter),
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return fetchFeed(accessToken, filter, pageParam, pageSize, signal);
    },
    getNextPageParam: (last) => last.page.nextCursor,
    enabled: Boolean(accessToken),
    retry: 0,
  });
}
