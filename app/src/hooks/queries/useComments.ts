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
    onSuccess: (created) => {
      if (!postExtId) {return;}
      qc.setQueryData<InfiniteData<CommentList, number | null>>(
        commentsQueryKey(postExtId),
        (prev) => {
          if (!prev || prev.pages.length === 0) {
            return {
              pageParams: [null],
              pages: [
                {
                  items: [created],
                  page: { nextCursor: null, size: COMMENTS_PAGE_SIZE },
                },
              ],
            };
          }
          const lastIdx = prev.pages.length - 1;
          const lastPage = prev.pages[lastIdx];
          if (!lastPage) {return prev;}
          const updatedLast: CommentList = {
            items: [...lastPage.items, created],
            page: lastPage.page,
          };
          const nextPages = prev.pages.slice(0, lastIdx).concat(updatedLast);
          return { ...prev, pages: nextPages };
        },
      );
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
    onSuccess: (_void, variables) => {
      if (!postExtId) {return;}
      qc.setQueryData<InfiniteData<CommentList, number | null>>(
        commentsQueryKey(postExtId),
        (prev) => {
          if (!prev) {return prev;}
          const nextPages = prev.pages.map((page) => {
            const filtered = page.items.filter(
              (c) => c.extId !== variables.commentExtId,
            );
            if (filtered.length === page.items.length) {return page;}
            return { ...page, items: filtered };
          });
          return { ...prev, pages: nextPages };
        },
      );
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
