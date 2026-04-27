import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import { createComment, deleteComment, fetchComments } from '@/lib/api';
import type {
  Comment,
  CommentList,
  FeedItem,
  FeedList,
} from '@/lib/schemas/feed';

import { FEED_QUERY_KEY_ROOT } from './useFeed';

/**
 * 댓글 관련 React Query 훅.
 *
 * 쿼리키 규약:
 *   - 게시글별 목록: `['comments', postExtId]`
 *
 * 페이지 크기는 백엔드 default(20) 와 일치시키되, 호출부에서 override 가능.
 */
export const COMMENTS_QUERY_KEY_ROOT = ['comments'] as const;

export const COMMENTS_PAGE_SIZE = 20;

export function commentsQueryKey(postExtId: string) {
  return ['comments', postExtId] as const;
}

export function useCommentsQuery(
  accessToken: string | null,
  postExtId: string | null | undefined,
  pageSize: number = COMMENTS_PAGE_SIZE,
) {
  return useInfiniteQuery<
    CommentList,
    Error,
    InfiniteData<CommentList, number | null>,
    ReturnType<typeof commentsQueryKey>,
    number | null
  >({
    queryKey: postExtId ? commentsQueryKey(postExtId) : ['comments', '__none__'],
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      if (!postExtId) {
        return Promise.reject(new Error('post extId is required'));
      }
      return fetchComments(accessToken, postExtId, pageParam, pageSize, signal);
    },
    getNextPageParam: (last) => last.page.nextCursor,
    enabled: Boolean(accessToken && postExtId),
    retry: 0,
  });
}

/**
 * 모든 피드 캐시 페이지에서 `extId` 가 일치하는 아이템의 `comments` 카운트를 patch.
 * 좋아요 훅의 patchFeedItem 와 같은 구조 — 따로 export 하지 않고 내부에 둔다.
 */
function patchFeedItemComments(
  data: InfiniteData<FeedList, number | null> | undefined,
  postExtId: string,
  delta: number,
): InfiniteData<FeedList, number | null> | undefined {
  if (!data) {return data;}
  let touched = false;
  const nextPages = data.pages.map((page) => {
    let pageTouched = false;
    const nextItems: FeedItem[] = page.items.map((item) => {
      if (item.extId !== postExtId) {return item;}
      pageTouched = true;
      return { ...item, comments: Math.max(0, item.comments + delta) };
    });
    if (!pageTouched) {return page;}
    touched = true;
    return { ...page, items: nextItems };
  });
  if (!touched) {return data;}
  return { ...data, pages: nextPages };
}

/**
 * 댓글 작성 mutation.
 *
 * 성공 시:
 * - 해당 게시글의 댓글 목록 캐시를 invalidate (재요청으로 정렬·페이지 정합 보장).
 * - 모든 피드 캐시의 `comments` 카운트 +1 (낙관 갱신; 빠른 시각 피드백).
 *   서버 진실값은 다음 피드 refetch 에서 정합화된다.
 */
export function useCreateCommentMutation(
  accessToken: string | null,
  postExtId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation<
    Comment,
    Error,
    { content: string; parentExtId?: string | null }
  >({
    mutationFn: ({ content, parentExtId }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      if (!postExtId) {
        return Promise.reject(new Error('post extId is required'));
      }
      return createComment(accessToken, postExtId, content, parentExtId);
    },
    onSuccess: () => {
      if (!postExtId) {return;}
      qc.invalidateQueries({ queryKey: commentsQueryKey(postExtId) });
      // 피드 카드의 `comments` 카운트 +1.
      const queries = qc.getQueriesData<InfiniteData<FeedList, number | null>>({
        queryKey: FEED_QUERY_KEY_ROOT,
      });
      for (const [key, data] of queries) {
        const patched = patchFeedItemComments(data, postExtId, 1);
        if (patched !== data) {
          qc.setQueryData(key, patched);
        }
      }
    },
  });
}

/**
 * 댓글 삭제 mutation. 본인 댓글만 백엔드에서 허용 (403 시 ApiError).
 *
 * 성공 시:
 * - 댓글 목록 캐시를 invalidate.
 * - 피드 캐시의 `comments` 카운트 -1.
 */
export function useDeleteCommentMutation(
  accessToken: string | null,
  postExtId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation<void, Error, { commentExtId: string }>({
    mutationFn: ({ commentExtId }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return deleteComment(accessToken, commentExtId);
    },
    onSuccess: () => {
      if (!postExtId) {return;}
      qc.invalidateQueries({ queryKey: commentsQueryKey(postExtId) });
      const queries = qc.getQueriesData<InfiniteData<FeedList, number | null>>({
        queryKey: FEED_QUERY_KEY_ROOT,
      });
      for (const [key, data] of queries) {
        const patched = patchFeedItemComments(data, postExtId, -1);
        if (patched !== data) {
          qc.setQueryData(key, patched);
        }
      }
    },
  });
}
