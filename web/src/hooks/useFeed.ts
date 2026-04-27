'use client';

import {
  useInfiniteQuery,
  type InfiniteData,
} from '@tanstack/react-query';

import { fetchFeed } from '@/lib/api';
import type { FeedFilter, FeedList } from '@/lib/schemas/feed';

/**
 * Feed 관련 React Query 훅.
 *
 * 쿼리키 규약:
 *   - 목록: `['feed', filter]` — 필터마다 분리된 캐시·페이지네이션 상태.
 *
 * accessToken 은 (다른 훅 선례와 동일하게) queryKey 에 포함하지 않는다.
 * 사용자 식별자가 아니며, refresh 로 토큰이 바뀌어도 동일 캐시를 재사용해
 * 불필요한 재요청을 막는다.
 */

export function feedQueryKey(filter: FeedFilter) {
  return ['feed', filter] as const;
}

/**
 * 피드 목록을 무한 스크롤로 로드.
 *
 * `pageParam` 은 다음 커서 (`null` 이면 첫 페이지).
 *
 * 필터 전환은 호출부에서 `filter` 를 바꾸기만 하면 새 queryKey 로 분기되어
 * 페이지네이션이 자연스럽게 리셋된다 (TanStack Query 의 키 격리 패턴).
 */
export function useFeedQuery(
  accessToken: string | null,
  filter: FeedFilter,
  pageSize?: number,
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
