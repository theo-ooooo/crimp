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
 * 좋아요·댓글은 read-only (Phase 1.5). 클릭 핸들러는 추후 PR 에서 추가.
 */

import type { CSSProperties, FC } from 'react';

import {
  GradeBadge,
  HoldDot,
  ResultMark,
  type HoldColorKey,
} from '@/components/primitives';
import { t } from '@/lib/i18n';
import { colors } from '@/lib/tokens';
import type { FeedItem } from '@/lib/schemas/feed';
import { formatRelativeTime } from '@/lib/format/relativeTime';

export interface FeedPostCardProps {
  item: FeedItem;
}

export const FeedPostCard: FC<FeedPostCardProps> = ({ item }) => {
  const initial = (item.userNickname.trim().charAt(0) || '?').toUpperCase();

  // hue 는 0~359 범위로 정규화 (백엔드 계약상 정수 보장이지만 방어).
  const safeHue = ((item.avatarColorHue % 360) + 360) % 360;
  const avatarStyle: CSSProperties = {
    background: `oklch(82% 0.06 ${safeHue})`,
    color: 'var(--color-text)',
  };

  const timeLabel = formatRelativeTime(item.loggedAt);
  const metaCaption = item.gymName
    ? `${timeLabel} · ${item.gymName}`
    : timeLabel;

  return (
    <article
      className="mb-3 flex flex-col rounded-[18px] border border-hairline bg-bg p-4"
      aria-label={`${item.userNickname} 의 시도 기록`}
    >
      {/* 헤더 */}
      <div className="mb-2.5 flex items-center gap-2.5">
        <div
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
          style={avatarStyle}
        >
          {initial}
        </div>
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
            {item.result}
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
        <FooterMetric icon={<HeartIcon />} count={item.likes} ariaLabel={t('feed.card.likesAria')} />
        <FooterMetric icon={<CommentIcon />} count={item.comments} ariaLabel={t('feed.card.commentsAria')} />
      </div>
    </article>
  );
};

// ─────────────────────────────────────────────────────────────
// 내부 helpers
// ─────────────────────────────────────────────────────────────

function FooterMetric({
  icon,
  count,
  ariaLabel,
}: {
  icon: React.ReactNode;
  count: number;
  ariaLabel: string;
}): JSX.Element {
  return (
    <div
      className="flex items-center gap-1.5 text-[13px] font-semibold text-text-2"
      aria-label={`${ariaLabel} ${count}`}
    >
      {icon}
      <span className="tabular-nums">{count}</span>
    </div>
  );
}

/**
 * mock 의 stroke 하트 아이콘.
 * `docs/design/claude/v2/screens-ios-2.jsx:525` 와 동일한 path.
 */
function HeartIcon(): JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
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
