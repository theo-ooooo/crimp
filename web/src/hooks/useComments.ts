'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import {
  createComment,
  deleteComment,
  fetchComments,
} from '@/lib/api';
import type {
  Comment,
  CommentList,
  FeedFilter,
  FeedItem,
  FeedList,
} from '@/lib/schemas/feed';

import { feedQueryKey } from './useFeed';

/**
 * Comment 관련 React Query 훅.
 *
 * 쿼리키 규약:
 *  - 댓글 목록: `['comments', postExtId]` — 무한 스크롤
 *
 * accessToken 은 (다른 훅 선례와 동일하게) queryKey 에서 제외 — refresh 시 재요청 회피.
 *
 * 댓글 작성/삭제 후에는 피드 카드의 `comments` 카운트도 함께 동기화한다 (모든 필터 캐시).
 */

const FEED_FILTERS: readonly FeedFilter[] = ['popular', 'my-gym', 'friends'] as const;

export function commentsQueryKey(postExtId: string) {
  return ['comments', postExtId] as const;
}

/** 피드 모든 필터 캐시에서 특정 포스트의 `comments` 카운트를 delta 만큼 갱신. */
function bumpFeedCommentCount(
  qc: ReturnType<typeof useQueryClient>,
  postExtId: string,
  delta: number,
) {
  for (const filter of FEED_FILTERS) {
    const key = feedQueryKey(filter);
    const data = qc.getQueryData<InfiniteData<FeedList, number | null>>(key);
    if (!data) continue;
    const next: InfiniteData<FeedList, number | null> = {
      ...data,
      pages: data.pages.map((p) => {
        let touched = false;
        const items = p.items.map((item: FeedItem) => {
          if (item.extId !== postExtId) return item;
          touched = true;
          return {
            ...item,
            comments: Math.max(0, item.comments + delta),
          };
        });
        return touched ? { ...p, items } : p;
      }),
    };
    qc.setQueryData(key, next);
  }
}

/**
 * 댓글 목록을 무한 스크롤로 로드.
 *
 * `pageParam` 은 다음 커서 (`null` 이면 첫 페이지).
 * `enabled` 는 호출부 옵션으로 추가 제어 — 댓글 다이얼로그 열림 상태에 묶기 위함.
 */
export function useCommentsQuery(
  accessToken: string | null,
  postExtId: string | null | undefined,
  options: { enabled?: boolean; pageSize?: number } = {},
) {
  const { enabled = true, pageSize } = options;
  return useInfiniteQuery<
    CommentList,
    Error,
    InfiniteData<CommentList, number | null>,
    ReturnType<typeof commentsQueryKey>,
    number | null
  >({
    queryKey: postExtId
      ? commentsQueryKey(postExtId)
      : (['comments', '__none__'] as ReturnType<typeof commentsQueryKey>),
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
    enabled: Boolean(accessToken && postExtId && enabled),
    retry: 0,
  });
}

interface CreateCommentVariables {
  content: string;
  parentExtId?: string | null;
}

/**
 * 댓글 작성 뮤테이션.
 *
 * 성공 시:
 *  - 댓글 무한 쿼리의 첫 페이지 `items` 끝에 새 댓글을 append (서버 정렬 = id ASC 가정).
 *    백엔드 정렬 기준이 변경되면 invalidate 로 단순화 가능.
 *  - 피드 카드의 `comments` 카운트 +1.
 */
export function useCreateCommentMutation(
  accessToken: string | null,
  postExtId: string,
) {
  const qc = useQueryClient();

  return useMutation<Comment, Error, CreateCommentVariables>({
    mutationFn: ({ content, parentExtId }) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return createComment(accessToken, postExtId, content, parentExtId ?? null);
    },
    onSuccess: (created) => {
      const key = commentsQueryKey(postExtId);
      const data =
        qc.getQueryData<InfiniteData<CommentList, number | null>>(key);
      if (data && data.pages.length > 0) {
        // 서버는 id ASC (오래된 → 최신) 정렬이므로 마지막 페이지의 마지막에 append.
        const lastIndex = data.pages.length - 1;
        const lastPage = data.pages[lastIndex];
        if (lastPage) {
          const updatedLast: CommentList = {
            ...lastPage,
            items: [...lastPage.items, created],
          };
          const nextPages = data.pages.slice();
          nextPages[lastIndex] = updatedLast;
          qc.setQueryData<InfiniteData<CommentList, number | null>>(key, {
            ...data,
            pages: nextPages,
          });
        }
      } else {
        // 캐시가 비어있으면 invalidate 로 다음 fetch 를 위임.
        void qc.invalidateQueries({ queryKey: key });
      }
      bumpFeedCommentCount(qc, postExtId, +1);
    },
  });
}

/**
 * 댓글 삭제 뮤테이션 (본인 댓글만 — 백엔드 강제).
 *
 * 캐시에서 해당 댓글을 제거하고 피드 댓글 카운트 -1. 실패 시 invalidate 로 회복.
 */
export function useDeleteCommentMutation(
  accessToken: string | null,
  postExtId: string,
) {
  const qc = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (commentExtId) => {
      if (!accessToken) {
        return Promise.reject(new Error('access token is required'));
      }
      return deleteComment(accessToken, commentExtId);
    },
    onSuccess: (_, commentExtId) => {
      const key = commentsQueryKey(postExtId);
      const data =
        qc.getQueryData<InfiniteData<CommentList, number | null>>(key);
      if (data) {
        const next: InfiniteData<CommentList, number | null> = {
          ...data,
          pages: data.pages.map((p) => ({
            ...p,
            items: p.items.filter((c) => c.extId !== commentExtId),
          })),
        };
        qc.setQueryData(key, next);
      }
      bumpFeedCommentCount(qc, postExtId, -1);
    },
    onError: () => {
      // 실패 시 서버 상태와 다시 정합 — 가장 안전한 폴백.
      void qc.invalidateQueries({ queryKey: commentsQueryKey(postExtId) });
    },
  });
}
