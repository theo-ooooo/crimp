'use client';

import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import { togglePostLike } from '@/lib/api';
import type {
  FeedFilter,
  FeedItem,
  FeedList,
  LikeToggleResponse,
} from '@/lib/schemas/feed';

import { feedQueryKey } from './useFeed';

/**
 * 좋아요 토글 뮤테이션.
 *
 * 낙관적 업데이트:
 *  1. `onMutate`: 모든 피드 필터 캐시(`['feed', filter]`)를 순회해
 *     해당 `postExtId` 의 `liked`/`likes` 를 즉시 갱신.
 *     이전 스냅샷을 context 로 보관해 실패 시 롤백.
 *  2. `onError`: 보관한 스냅샷으로 캐시 복원. 호출부에서 toast 등 추가 처리.
 *  3. `onSuccess`: 서버 권위 카운트(`likeCount`)로 다시 한번 동기화 — 빠른
 *     연속 클릭으로 인한 카운트 드리프트 보정.
 *
 * 캐시는 `feed` 필터마다 분리되어 있고 (popular/my-gym/friends), 같은 포스트가
 * 여러 필터에 동시에 노출될 수 있으므로 모든 필터 캐시를 순회한다.
 */

const FEED_FILTERS: readonly FeedFilter[] = ['popular', 'my-gym', 'friends'] as const;

interface ToggleVariables {
  /** 현재 좋아요 상태(낙관적 토글의 시작점). */
  currentlyLiked: boolean;
}

interface ToggleContext {
  /** 롤백용 이전 캐시 스냅샷 — 필터 → InfiniteData. */
  snapshots: Array<{
    key: ReturnType<typeof feedQueryKey>;
    data: InfiniteData<FeedList, number | null> | undefined;
  }>;
}

/** 한 페이지의 items 에서 특정 extId 항목만 patch 한 새 페이지를 반환 (불변 갱신). */
function patchFeedItem(
  list: FeedList,
  postExtId: string,
  patch: (item: FeedItem) => FeedItem,
): FeedList {
  let touched = false;
  const items = list.items.map((item) => {
    if (item.extId !== postExtId) return item;
    touched = true;
    return patch(item);
  });
  if (!touched) return list;
  return { ...list, items };
}

function patchAllPages(
  data: InfiniteData<FeedList, number | null> | undefined,
  postExtId: string,
  patch: (item: FeedItem) => FeedItem,
): InfiniteData<FeedList, number | null> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((p) => patchFeedItem(p, postExtId, patch)),
  };
}

export function useLikeToggleMutation(
  accessToken: string | null,
  postExtId: string,
) {
  const qc = useQueryClient();

  return useMutation<LikeToggleResponse, Error, ToggleVariables, ToggleContext>({
    mutationFn: ({ currentlyLiked }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return togglePostLike(
        accessToken,
        postExtId,
        currentlyLiked ? 'unlike' : 'like',
      );
    },
    onMutate: async ({ currentlyLiked }) => {
      // 필터별 캐시를 모두 순회 — 같은 포스트가 여러 필터에 노출될 수 있다.
      const snapshots: ToggleContext['snapshots'] = [];

      for (const filter of FEED_FILTERS) {
        const key = feedQueryKey(filter);
        // 진행 중인 refetch 가 우리 낙관 갱신을 덮어쓰지 않도록 일단 취소.
        await qc.cancelQueries({ queryKey: key });

        const prev = qc.getQueryData<InfiniteData<FeedList, number | null>>(key);
        snapshots.push({ key, data: prev });

        if (!prev) continue;
        const next = patchAllPages(prev, postExtId, (item) => ({
          ...item,
          liked: !currentlyLiked,
          // 현재 좋아요 상태 → 토글 후 카운트.
          likes: Math.max(0, item.likes + (currentlyLiked ? -1 : 1)),
        }));
        qc.setQueryData(key, next);
      }

      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      if (!context) return;
      for (const { key, data } of context.snapshots) {
        qc.setQueryData(key, data);
      }
    },
    onSuccess: (response) => {
      // 서버 권위 카운트로 마지막 동기화 — 낙관 갱신과의 미세한 드리프트를 보정.
      // (예: 다른 클라이언트의 동시 좋아요로 +N 차이가 났을 때)
      for (const filter of FEED_FILTERS) {
        const key = feedQueryKey(filter);
        const current = qc.getQueryData<InfiniteData<FeedList, number | null>>(key);
        if (!current) continue;
        const next = patchAllPages(current, postExtId, (item) => ({
          ...item,
          liked: response.liked,
          likes: response.likeCount,
        }));
        qc.setQueryData(key, next);
      }
    },
  });
}
