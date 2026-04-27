import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import { togglePostLike } from '@/lib/api';
import type { FeedItem, FeedList, LikeToggleResponse } from '@/lib/schemas/feed';

import { FEED_QUERY_KEY_ROOT } from './useFeed';

/**
 * 좋아요 토글 mutation.
 *
 * 전략:
 * 1) 사용자 탭 즉시 → 모든 피드 캐시(`['feed', filter]`) 를 순회하며 `extId` 가 일치하는
 *    아이템의 `liked` 와 `likes` 를 낙관적으로 갱신.
 * 2) 서버 응답이 오면 같은 아이템의 `liked` / `likes` 를 서버 진실값으로 동기화.
 * 3) 네트워크/4xx 에러 시 onError 에서 컨텍스트의 스냅샷으로 롤백.
 *
 * 이전/이후 상태(`liked`)는 호출부에서 알 수 있으므로 mutate 인자로 받는다.
 * (`action` 은 명시적으로 받아 race condition 방지 — 빠른 더블탭 시 한 방향만 보냄.)
 */

type LikeToggleVariables = {
  postExtId: string;
  /** 토글 후 가야 할 상태 (현재 false → like, 현재 true → unlike). */
  next: boolean;
};

type LikeToggleContext = {
  /** 롤백을 위한 캐시 스냅샷. queryKey → 데이터 형태(InfiniteData<FeedList>). */
  snapshots: Array<{
    key: ReadonlyArray<unknown>;
    data: InfiniteData<FeedList, number | null> | undefined;
  }>;
};

/**
 * 모든 피드 캐시 페이지에서 `extId` 와 일치하는 아이템에 patch 를 적용한 새 InfiniteData 를 반환.
 * 캐시 자체는 변경하지 않는다(캐시 변경은 호출부에서 setQueryData 로 처리).
 */
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
      // 진행 중인 피드 refetch 를 취소해 stale data 가 낙관 상태를 덮어쓰지 않게 한다.
      await qc.cancelQueries({ queryKey: FEED_QUERY_KEY_ROOT });

      const queries = qc.getQueriesData<InfiniteData<FeedList, number | null>>({
        queryKey: FEED_QUERY_KEY_ROOT,
      });
      const snapshots: LikeToggleContext['snapshots'] = queries.map(
        ([key, data]) => ({ key, data }),
      );

      for (const [key, data] of queries) {
        const patched = patchFeedItem(data, postExtId, (item) => {
          // 같은 next 로 두 번 들어온 경우 카운트 중복 변동을 막기 위해 현재 상태 비교.
          if (item.liked === next) {return item;}
          const delta = next ? 1 : -1;
          // 서버 진실값은 onSuccess 에서 동기화 — 여기서는 음수 방어만.
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
      // 모든 스냅샷을 그대로 복원. 이 시점 이후 새 refetch 는 정상 흐름.
      if (!ctx) {return;}
      for (const { key, data } of ctx.snapshots) {
        qc.setQueryData(key, data);
      }
    },
    onSuccess: (resp, { postExtId }) => {
      // 서버 진실값으로 모든 피드 캐시를 다시 동기화.
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
