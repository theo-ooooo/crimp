'use client';

/**
 * 댓글 다이얼로그 — 피드 카드의 댓글 버튼 클릭 시 열린다.
 *
 * 동작 요약:
 *  - `useCommentsQuery` 로 무한 스크롤 (id ASC, 오래된 → 최신).
 *  - 본인 댓글은 인라인 삭제 버튼 노출 — `currentUserExtId` 와 `userExtId` 비교.
 *    (롱프레스/메뉴 등 advanced UX 는 후속 PR.)
 *  - 작성: 하단 textarea + 게시 버튼. 비어있거나 1000자 초과면 비활성.
 *  - 인증 만료(401) 등 실패 시 `toUserMessage` 로 i18n 메시지.
 *
 * 접근성:
 *  - `role="dialog"` + `aria-modal` + `aria-labelledby`
 *  - Esc / 백드롭 클릭 / 닫기 버튼으로 닫힘
 *  - prefers-reduced-motion 일 때 enter 애니메이션 생략 (LogAttemptSheet 와 동일 패턴)
 *
 * 본 컴포넌트는 항상 모바일 친화 바텀 시트 스타일로 표시한다 (max-w 2xl 컬럼 폭).
 */

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FC,
  type FormEvent,
} from 'react';

import { useCommentsQuery, useCreateCommentMutation, useDeleteCommentMutation } from '@/hooks/useComments';
import { toUserMessage } from '@/lib/api/errorMessage';
import { formatRelativeTime } from '@/lib/format/relativeTime';
import { t } from '@/lib/i18n';
import type { Comment } from '@/lib/schemas/feed';

import { Avatar } from './Avatar';

const MAX_CONTENT_LENGTH = 1000;

export interface CommentDialogProps {
  /** 다이얼로그가 표시될 포스트 extId. null 이면 닫힘. */
  postExtId: string | null;
  accessToken: string;
  /** 현재 사용자 extId — 본인 댓글 판별용. null 이면 모든 삭제 버튼 비표시. */
  currentUserExtId: string | null;
  onClose: () => void;
}

/** prefers-reduced-motion 감지. LogAttemptSheet 와 동일 구현. */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => {
      setReduced(e.matches);
    };
    mq.addEventListener('change', onChange);
    return () => {
      mq.removeEventListener('change', onChange);
    };
  }, []);
  return reduced;
}

export const CommentDialog: FC<CommentDialogProps> = ({
  postExtId,
  accessToken,
  currentUserExtId,
  onClose,
}) => {
  const titleId = useId();
  const reducedMotion = useReducedMotion();
  const sheetRef = useRef<HTMLDivElement | null>(null);

  // postExtId 가 null 이면 다이얼로그를 마운트하지 않는다 (호출부에서 conditional render).
  // 이 가드는 props 보호용 — 실제로는 도달하지 않는 경로.
  const open = postExtId !== null;

  // Esc 닫기 + Tab focus trap. LogAttemptSheet:130-178 와 동일 패턴.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = sheetRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || !root.contains(active)) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // 마운트 시 textarea 첫 포커스. 사용자가 곧바로 댓글을 작성하는 일반 흐름에 자연스럽다.
  useEffect(() => {
    if (!open) return;
    const root = sheetRef.current;
    if (!root) return;
    const textarea = root.querySelector<HTMLTextAreaElement>('textarea:not([disabled])');
    textarea?.focus();
  }, [open]);

  if (!open || postExtId === null) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
      className="fixed inset-0 z-[70] flex flex-col justify-end"
      style={{
        background: 'rgba(15,20,25,0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto flex max-h-[85%] w-full max-w-2xl flex-col rounded-t-2xl bg-bg text-text"
        style={
          reducedMotion
            ? undefined
            : {
                animation: 'crimp-sheet-in .3s cubic-bezier(.2,.8,.2,1)',
              }
        }
      >
        {/* 핸들 바 */}
        <div
          aria-hidden="true"
          className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-sm bg-text-4"
        />

        {/* 헤더 */}
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-3">
          <h2
            id={titleId}
            className="text-h2 font-extrabold tracking-[-0.03em] text-text"
          >
            {t('feed.comment.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="border-0 bg-transparent text-body font-semibold text-text-3"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            aria-label={t('common.close')}
          >
            {t('common.close')}
          </button>
        </div>

        <CommentDialogBody
          postExtId={postExtId}
          accessToken={accessToken}
          currentUserExtId={currentUserExtId}
        />
      </div>
    </div>
  );
};

interface CommentDialogBodyProps {
  postExtId: string;
  accessToken: string;
  currentUserExtId: string | null;
}

const CommentDialogBody: FC<CommentDialogBodyProps> = ({
  postExtId,
  accessToken,
  currentUserExtId,
}) => {
  const {
    data,
    error,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useCommentsQuery(accessToken, postExtId);

  const createMutation = useCreateCommentMutation(accessToken, postExtId);
  const deleteMutation = useDeleteCommentMutation(accessToken, postExtId);

  const [draft, setDraft] = useState<string>('');

  const items: Comment[] = data?.pages.flatMap((p) => p.items) ?? [];
  const trimmed = draft.trim();
  const submitDisabled =
    trimmed.length === 0 ||
    trimmed.length > MAX_CONTENT_LENGTH ||
    createMutation.isPending;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitDisabled) return;
    createMutation.mutate(
      { content: trimmed },
      {
        onSuccess: () => {
          setDraft('');
        },
      },
    );
  };

  return (
    <>
      {/* 본문 — 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto px-5">
        {isLoading ? (
          <ListLoading />
        ) : error ? (
          <ErrorBlock
            message={toUserMessage(error)}
            onRetry={() => {
              void refetch();
            }}
          />
        ) : items.length === 0 ? (
          <EmptyBlock />
        ) : (
          <ul className="flex flex-col gap-4 py-3">
            {items.map((c) => (
              <li key={c.extId}>
                <CommentRow
                  comment={c}
                  isOwn={
                    currentUserExtId !== null &&
                    c.userExtId === currentUserExtId
                  }
                  isDeleting={
                    deleteMutation.isPending &&
                    deleteMutation.variables === c.extId
                  }
                  onDelete={() => {
                    if (window.confirm(t('feed.comment.deleteConfirm'))) {
                      deleteMutation.mutate(c.extId);
                    }
                  }}
                />
              </li>
            ))}
            {hasNextPage ? (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    void fetchNextPage();
                  }}
                  disabled={isFetchingNextPage}
                  className="mx-auto mt-2 inline-flex h-9 items-center rounded-full bg-chip px-4 text-sm font-semibold text-text-2 transition-transform duration-fast ease-standard active:scale-[0.96] disabled:opacity-50"
                >
                  {isFetchingNextPage
                    ? t('feed.loadingMore')
                    : t('feed.loadMore')}
                </button>
              </li>
            ) : null}
          </ul>
        )}

        {/* 삭제 실패 메시지 — 인라인 표시 (인증 만료 등). */}
        {deleteMutation.error ? (
          <p
            role="alert"
            className="mb-3 rounded-xl bg-subtle p-3 text-caption text-danger"
          >
            {toUserMessage(deleteMutation.error)}
          </p>
        ) : null}
      </div>

      {/* 작성 영역 */}
      <form
        onSubmit={onSubmit}
        className="shrink-0 border-t border-hairline bg-bg p-4 pb-[max(env(safe-area-inset-bottom),16px)]"
      >
        <label className="block">
          <span className="sr-only">{t('feed.comment.placeholder')}</span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_CONTENT_LENGTH}
            rows={2}
            placeholder={t('feed.comment.placeholder')}
            className="w-full resize-none rounded-2xl border-0 bg-subtle p-3 text-body font-medium text-text placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <div className="mt-2 flex items-center justify-between gap-3">
          {/* 글자 수 카운터 — 1000 도달 시 강조. */}
          <p
            aria-live="polite"
            className={
              'text-caption tabular-nums ' +
              (trimmed.length >= MAX_CONTENT_LENGTH
                ? 'font-bold text-accent-ink'
                : 'text-text-3')
            }
          >
            {trimmed.length} / {MAX_CONTENT_LENGTH}
          </p>
          <button
            type="submit"
            disabled={submitDisabled}
            className="inline-flex h-10 items-center rounded-full bg-accent px-5 text-sm font-bold text-white transition-transform duration-fast ease-standard active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-subtle-2 disabled:text-text-3"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {createMutation.isPending
              ? t('feed.comment.submitting')
              : t('feed.comment.submit')}
          </button>
        </div>
        {createMutation.error ? (
          <p
            role="alert"
            className="mt-2 text-caption text-danger"
          >
            {toUserMessage(createMutation.error)}
          </p>
        ) : null}
      </form>
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// 보조 컴포넌트
// ─────────────────────────────────────────────────────────────

function CommentRow({
  comment,
  isOwn,
  isDeleting,
  onDelete,
}: {
  comment: Comment;
  isOwn: boolean;
  isDeleting: boolean;
  onDelete: () => void;
}): JSX.Element {
  const timeLabel = formatRelativeTime(comment.createdAt);
  const nickname = comment.userNickname ?? '?';
  return (
    <article className="flex items-start gap-2.5">
      <Avatar
        nickname={comment.userNickname}
        hue={comment.avatarColorHue}
        size={28}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <p className="truncate text-sm font-bold tracking-[-0.02em] text-text">
            {nickname}
          </p>
          <p className="text-[11px] font-medium text-text-3">{timeLabel}</p>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm font-medium leading-[1.5] tracking-[-0.01em] text-text">
          {comment.content}
        </p>
      </div>
      {isOwn ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          aria-label={t('feed.comment.deleteCta')}
          className="shrink-0 border-0 bg-transparent p-1 text-[11px] font-semibold text-text-3 disabled:opacity-50"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {t('feed.comment.deleteCta')}
        </button>
      ) : null}
    </article>
  );
}

function ListLoading(): JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className="py-8 text-center text-caption text-text-3"
    >
      {t('common.loading')}
    </div>
  );
}

function EmptyBlock(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <p className="text-title font-bold text-text">
        {t('feed.comment.empty')}
      </p>
    </div>
  );
}

function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): JSX.Element {
  return (
    <div
      role="alert"
      className="my-4 flex flex-col gap-2 rounded-2xl bg-subtle p-4"
    >
      <p className="text-title font-bold text-danger">
        {t('feed.comment.errorTitle')}
      </p>
      <p className="text-caption text-text-2">{message}</p>
      <div>
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex h-8 items-center rounded-full bg-chip px-3 text-caption font-semibold text-text-2 transition-transform duration-fast ease-standard active:scale-[0.96]"
        >
          {t('common.retry')}
        </button>
      </div>
    </div>
  );
}
