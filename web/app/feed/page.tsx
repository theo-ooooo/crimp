'use client';

/**
 * `/feed` — 커뮤니티 피드.
 *
 * 디자인 (`docs/design/claude/v2/screens-ios-2.jsx:482-538`):
 * - 헤더: "피드" 32px extrabold, padding `24px 20px 12px`
 * - 필터 칩 가로 스크롤 (친구 / 인기 / 내 암장) — 기본 `친구` active
 * - 포스트 카드 리스트 (FeedPostCard)
 *
 * 데이터 소스: `GET /api/v1/feed?filter=...&cursor=...&size=...` (PR #53)
 *
 * 인증 가드 / hydration 패턴은 `app/sessions/page.tsx` 와 동일.
 * BottomTabs 는 웹에 아직 없음 — 추후 별도 PR. 본 페이지는 `max-w-2xl` 중앙 컬럼.
 */

import { useState } from 'react';

import { CrimpIcon, SecondaryButton, Skeleton } from '@/components/primitives';
import { FeedFilterTabs } from '@/components/feed/FeedFilterTabs';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { useFeedQuery } from '@/hooks/useFeed';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import type { FeedFilter, FeedItem } from '@/lib/schemas/feed';
import { useAccessToken, useTokenStore } from '@/store/tokenStore';

/** 디자인 mock 의 기본 active 탭. */
const DEFAULT_FILTER: FeedFilter = 'friends';

export default function FeedPage(): JSX.Element {
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useAccessToken();

  // 필터 상태는 쿼리 파라미터가 아니라 컴포넌트 로컬 상태로 관리한다.
  // 향후 공유 URL · 딥링크 요구가 생기면 useSearchParams 기반으로 이전.
  const [filter, setFilter] = useState<FeedFilter>(DEFAULT_FILTER);

  if (!hydrated) {
    return <HydrationGate />;
  }

  if (!accessToken) {
    return <LoginRequired />;
  }

  return (
    <FeedContent
      accessToken={accessToken}
      filter={filter}
      onFilterChange={setFilter}
    />
  );
}

interface FeedContentProps {
  accessToken: string;
  filter: FeedFilter;
  onFilterChange: (next: FeedFilter) => void;
}

function FeedContent({
  accessToken,
  filter,
  onFilterChange,
}: FeedContentProps): JSX.Element {
  const {
    data,
    error,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useFeedQuery(accessToken, filter);

  const items: FeedItem[] = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col bg-bg pb-10">
      {/* 헤더 */}
      <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-6">
        <h1 className="text-h1 font-extrabold tracking-[-0.04em] text-text">
          {t('feed.title')}
        </h1>
        <button
          type="button"
          aria-label={t('feed.refreshAria')}
          onClick={() => {
            void refetch();
          }}
          disabled={isFetching}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-chip text-text-2 transition-transform duration-fast ease-standard active:scale-[0.96] disabled:opacity-50"
        >
          <RefreshIcon />
        </button>
      </header>

      {/* 필터 탭 */}
      <FeedFilterTabs active={filter} onChange={onFilterChange} />

      {/* 본문 */}
      <div className="px-5 pt-2">
        {isLoading ? (
          <ListSkeleton />
        ) : error ? (
          <ErrorCard
            title={t('feed.errorTitle')}
            message={toUserMessage(error)}
            onRetry={() => {
              void refetch();
            }}
          />
        ) : items.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.extId}>
                <FeedPostCard item={item} />
              </li>
            ))}
          </ul>
        )}

        {hasNextPage ? (
          <div className="mx-auto mt-4 w-full max-w-xs">
            <SecondaryButton
              onClick={() => {
                void fetchNextPage();
              }}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage
                ? t('feed.loadingMore')
                : t('feed.loadMore')}
            </SecondaryButton>
          </div>
        ) : null}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// 보조 컴포넌트
// ─────────────────────────────────────────────────────────────

function HydrationGate(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 bg-bg px-5 py-6">
      <Skeleton h={32} w="40%" />
      <div className="flex gap-1.5">
        <Skeleton h={36} w={64} r={18} />
        <Skeleton h={36} w={64} r={18} />
        <Skeleton h={36} w={72} r={18} />
      </div>
      <div className="mt-2 flex flex-col gap-3">
        <Skeleton h={140} r={18} />
        <Skeleton h={140} r={18} />
      </div>
    </main>
  );
}

function LoginRequired(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-3 bg-bg px-6">
      <h1 className="text-h1 font-extrabold text-text">
        {t('feed.loginRequiredTitle')}
      </h1>
      <p className="text-body text-text-2">
        {t('feed.loginRequiredDescription')}
      </p>
    </main>
  );
}

function ListSkeleton(): JSX.Element {
  return (
    <ul aria-busy="true" aria-live="polite" className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="rounded-[18px] border border-hairline p-4"
        >
          <div className="flex items-center gap-2.5">
            <Skeleton h={36} w={36} r={18} />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton h={14} w="40%" />
              <Skeleton h={11} w="60%" />
            </div>
            <Skeleton h={26} w={26} r={13} />
          </div>
          <div className="mt-3">
            <Skeleton h={14} w="80%" />
            <div className="mt-2">
              <Skeleton h={14} w="55%" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ErrorCard({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}): JSX.Element {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-[18px] border border-hairline p-5"
    >
      <p className="text-title font-bold text-danger">{title}</p>
      <p className="text-body text-text-2">{message}</p>
      <div className="mt-1">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-9 items-center rounded-full bg-chip px-4 text-sm font-semibold text-text-2 transition-transform duration-fast ease-standard active:scale-[0.96]"
        >
          {t('common.retry')}
        </button>
      </div>
    </div>
  );
}

/**
 * 필터별 메시지가 다른 빈 상태.
 * - friends: 팔로우 관계가 없거나, 팔로잉한 사용자 활동이 없을 때
 * - my-gym: 메인 암장이 미설정 (백엔드 명세상 빈 결과)
 * - popular: 글로벌 시도가 0건일 때 (드물지만 fresh 인스턴스에서 가능)
 */
function EmptyState({ filter }: { filter: FeedFilter }): JSX.Element {
  const titleKey =
    filter === 'friends'
      ? 'feed.empty.friendsTitle'
      : filter === 'my-gym'
        ? 'feed.empty.myGymTitle'
        : 'feed.empty.popularTitle';
  const descKey =
    filter === 'friends'
      ? 'feed.empty.friendsDescription'
      : filter === 'my-gym'
        ? 'feed.empty.myGymDescription'
        : 'feed.empty.popularDescription';

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[18px] border border-hairline px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-chip text-text-3">
        <CrimpIcon.feed s={28} />
      </div>
      <p className="text-title font-bold text-text">{t(titleKey)}</p>
      <p className="text-caption text-text-2">{t(descKey)}</p>
    </div>
  );
}

/**
 * 새로고침 아이콘 — 인라인 SVG.
 * CrimpIcon 딕셔너리에 refresh 가 없어 본 페이지 전용으로 정의.
 */
function RefreshIcon(): JSX.Element {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16.5 5.5A7 7 0 1 0 17 11" />
      <path d="M16.5 2.5v3.5h-3.5" />
    </svg>
  );
}
