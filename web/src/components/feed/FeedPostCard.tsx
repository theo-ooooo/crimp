'use client';

/**
 * 피드 게시 카드.
 *
 * 디자인 (`docs/design/claude/v2/screens-ios-2.jsx:494-534`):
 * - 카드: `border 1px hairline, radius 18, margin 0 20 12, padding 16`
 * - 아바타 36x36, 첫 글자, 배경 `oklch(82% 0.06 <hue>)`
 * - 닉네임 14 bold / 시간·암장 11 text3 medium
 * - 우측 ResultMark size 26
 * - 메타 줄: GradeBadge md + HoldDot 14 + result kind 라벨
 * - 본문 14 medium, line-height 1.5
 * - 푸터: hairline top, gap 18, heart/comment 인라인 SVG
 *
 * v2 (PR #56):
 *  - 하트는 `liked` 반영 + 클릭 시 `useLikeToggleMutation` (낙관적 업데이트는 훅 내부)
 *  - 댓글 버튼 클릭 → `onOpenComments` 콜백 호출 (다이얼로그 오픈은 부모 책임)
 */

import type { FC } from 'react';

import {
  GradeBadge,
  HoldDot,
  ResultMark,
  type HoldColorKey,
} from '@/components/primitives';
import { useLikeToggleMutation } from '@/hooks/useLikeToggle';
import { t } from '@/lib/i18n';
import { colors } from '@/lib/tokens';
import type { FeedItem } from '@/lib/schemas/feed';
import { formatRelativeTime } from '@/lib/format/relativeTime';

import { Avatar } from './Avatar';

export interface FeedPostCardProps {
  item: FeedItem;
  /** Bearer 토큰 — 좋아요 뮤테이션에 필요. null 이면 토글 비활성. */
  accessToken: string | null;
  /** 댓글 버튼 클릭 핸들러. 부모(FeedPage) 가 다이얼로그를 연다. */
  onOpenComments: (postExtId: string) => void;
}

export const FeedPostCard: FC<FeedPostCardProps> = ({
  item,
  accessToken,
  onOpenComments,
}) => {
  const timeLabel = formatRelativeTime(item.loggedAt);
  const metaCaption = item.gymName
    ? `${timeLabel} · ${item.gymName}`
    : timeLabel;

  // 결과 enum 한글 라벨 — 다른 화면(`sessions/[extId]`, `LogAttemptSheet`) 과 동일 키 사용.
  const resultLabel = t(`attempt.result.${item.result}` as const);

  const likeMutation = useLikeToggleMutation(accessToken, item.extId);
  const onLikeClick = () => {
    if (!accessToken || likeMutation.isPending) return;
    likeMutation.mutate({ currentlyLiked: item.liked });
  };

  // 좋아요 토글 버튼의 aria-label — 현재 상태에 따라 동작 안내가 바뀐다.
  // (I2: 카드 일부이므로 `feed.card.*` namespace 가 정확.)
  const likeAriaLabel = item.liked
    ? t('feed.card.likeAriaPressed')
    : t('feed.card.likeAriaUnpressed');

  return (
    <article
      className="mb-3 flex flex-col rounded-[18px] border border-hairline bg-bg p-4"
      aria-label={t('feed.card.postAria').replace('{{nickname}}', item.userNickname)}
    >
      {/* 헤더 */}
      <div className="mb-2.5 flex items-center gap-2.5">
        <Avatar nickname={item.userNickname} hue={item.avatarColorHue} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold tracking-[-0.02em] text-text">
            {item.userNickname}
          </p>
          <p className="truncate text-[11px] font-medium text-text-3">
            {metaCaption}
          </p>
        </div>
        <ResultMark kind={item.result} size={26} />
      </div>

      {/* 메타 (그레이드 / 홀드 / 결과 라벨) */}
      {(item.gradeValue || item.holdColor) && (
        <div className="mb-2.5 flex items-center gap-2">
          {item.gradeValue ? (
            <GradeBadge v={item.gradeValue} size="md" />
          ) : null}
          {item.holdColor ? (
            <HoldDot color={resolveHoldColor(item.holdColor)} size={14} />
          ) : null}
          <span className="text-xs font-bold tracking-[0.04em] text-text-3">
            {resultLabel}
          </span>
        </div>
      )}

      {/* 노트 */}
      {item.note ? (
        <p className="text-sm font-medium leading-[1.5] tracking-[-0.01em] text-text">
          {item.note}
        </p>
      ) : null}

      {/* 푸터 (좋아요 · 댓글) */}
      <div className="mt-3 flex gap-[18px] border-t border-hairline pt-3">
        <button
          type="button"
          onClick={onLikeClick}
          aria-pressed={item.liked}
          aria-label={likeAriaLabel}
          disabled={!accessToken || likeMutation.isPending}
          className={
            'flex items-center gap-1.5 border-0 bg-transparent p-0 text-[13px] font-semibold transition-colors duration-fast ease-standard active:scale-[0.96] disabled:cursor-not-allowed ' +
            (item.liked ? 'text-danger' : 'text-text-2')
          }
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <HeartIcon filled={item.liked} />
          <span className="tabular-nums">{item.likes}</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenComments(item.extId)}
          aria-label={t('feed.card.commentsAria')}
          className="flex items-center gap-1.5 border-0 bg-transparent p-0 text-[13px] font-semibold text-text-2 transition-colors duration-fast ease-standard active:scale-[0.96]"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <CommentIcon />
          <span className="tabular-nums">{item.comments}</span>
        </button>
      </div>
    </article>
  );
};

// ─────────────────────────────────────────────────────────────
// 내부 helpers
// ─────────────────────────────────────────────────────────────

/**
 * mock 의 stroke 하트 아이콘.
 * `docs/design/claude/v2/screens-ios-2.jsx:525` 와 동일한 path.
 *
 * `filled` 가 true 면 `currentColor` 로 채움 — 좋아요한 상태 시각 표현.
 */
function HeartIcon({ filled }: { filled: boolean }): JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M8 14s-5-3-5-7a3 3 0 0 1 5-2 3 3 0 0 1 5 2c0 4-5 7-5 7z" />
    </svg>
  );
}

/**
 * mock 의 stroke 말풍선 아이콘.
 * `docs/design/claude/v2/screens-ios-2.jsx:529` 와 동일한 path.
 */
function CommentIcon(): JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3H6l-3 2v-2a3 3 0 0 1-1-3z" />
    </svg>
  );
}

/**
 * 백엔드가 보내는 holdColor 문자열을 HoldDot 가 인식할 수 있는 형태로 정규화.
 * 토큰 키(`red`/`blue`/...) 또는 hex/rgb 같은 임의 색을 허용한다.
 *
 * 토큰 키로 매칭되지 않으면 그대로 넘겨 HoldDot 의 raw color fallback 을 활용.
 */
function resolveHoldColor(raw: string): HoldColorKey | string {
  const lower = raw.trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(colors.hold, lower)) {
    return lower as HoldColorKey;
  }
  return raw;
}
