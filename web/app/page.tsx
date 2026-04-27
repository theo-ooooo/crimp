'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  CrimpIcon,
  PrimaryButton,
  Skeleton,
} from '@/components/primitives';
import { useMeQuery } from '@/hooks/useMe';
import { useMeStatsQuery } from '@/hooks/useMeStats';
import { useSessionsQuery } from '@/hooks/useSessions';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import type { MeStats } from '@/lib/schemas/meStats';
import type { Session } from '@/lib/schemas/session';
import { useAccessToken, useTokenStore } from '@/store/tokenStore';

/**
 * `/` — 홈.
 *
 * 디자인 (`docs/design/claude/v2/screens-ios.jsx:55-151` HomeScreen — restrained):
 * - 인사: 14px caption eyebrow → 26px h1 (안녕 NICKNAME, 이번 주 N회 붙었어요)
 * - 큰 통계 카드: bg-subtle, rounded-xl(20), 좌측 56px 완등 + 우측 32px 최고 그레이드(accent)
 * - CTA: 풀너비 PrimaryButton (▶ 세션 시작하기)
 * - 최근 세션: 18px title + "전체" 링크 → border + rounded-2xl 카드 리스트 3개
 *
 * 상태 분기:
 * - hydration 전: 빈 placeholder (SSR mismatch 방지)
 * - 로그아웃: 브랜드 헤드라인 + 로그인 CTA
 * - 로그인 + 로딩: 스켈레톤
 *
 * 데이터 소스:
 * - `/api/v1/me/stats` (`useMeStatsQuery`) — 이번 주/누적 카운트, 최고 그레이드
 * - `/api/v1/me` (`useMeQuery`) — 닉네임 (없으면 `home.greetingFallbackNickname`)
 * - `/api/v1/me/sessions` (`useSessionsQuery`) — 최근 세션 3개
 */
export default function HomePage(): JSX.Element {
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useAccessToken();

  if (!hydrated) {
    return <HydrationGate />;
  }

  if (!accessToken) {
    return <LoggedOut />;
  }

  return <LoggedIn accessToken={accessToken} />;
}

function HydrationGate(): JSX.Element {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 bg-bg px-5 py-10"
    >
      <Skeleton h={20} w="35%" />
      <Skeleton h={32} w="70%" />
      <Skeleton h={180} r={20} />
      <Skeleton h={56} r={16} />
    </main>
  );
}

function LoggedOut(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 bg-bg px-5 py-10">
      <p className="text-caption font-bold uppercase tracking-[0.3em] text-accent-ink">
        {t('common.brand')}
      </p>
      <h1 className="text-h1 font-extrabold leading-snug tracking-[-0.04em] text-text">
        {t('home.loginPromptTitle')}
      </h1>
      <p className="text-body text-text-2">
        {t('home.loginPromptDescription')}
      </p>
      <div className="mt-2">
        <Link
          href="/login"
          aria-label={t('home.loginCta')}
          className="inline-flex h-14 w-full items-center justify-center rounded-lg bg-accent text-title font-bold text-accent-on transition-transform duration-fast ease-standard active:scale-[0.98]"
        >
          {t('home.loginCta')}
        </Link>
      </div>
    </main>
  );
}

function LoggedIn({ accessToken }: { accessToken: string }): JSX.Element {
  const router = useRouter();
  const meQuery = useMeQuery(accessToken);
  const statsQuery = useMeStatsQuery(accessToken);
  const sessionsQuery = useSessionsQuery(accessToken);

  const nickname =
    meQuery.data?.nickname ?? t('home.greetingFallbackNickname');

  const stats = statsQuery.data;
  const recentSessions: Session[] =
    sessionsQuery.data?.pages.flatMap((p) => p.items).slice(0, 3) ?? [];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 bg-bg px-5 py-10">
      {/* Greeting — 14px caption eyebrow + 26px h1 (mock: padding 24/20 8) */}
      <header className="flex flex-col gap-2 px-1">
        {statsQuery.isLoading ? (
          <>
            <Skeleton h={16} w="40%" />
            <Skeleton h={28} w="55%" />
            <Skeleton h={28} w="80%" />
          </>
        ) : (
          <>
            <p className="text-body font-semibold text-text-3">
              {t('home.greetingEyebrow')}
            </p>
            <h1 className="text-[26px] font-extrabold leading-[1.15] tracking-[-0.03em] text-text">
              {t('home.greeting').replace('{{nickname}}', nickname)}
              <br />
              <WeeklyHeadline weekSends={stats?.weekSends ?? 0} />
            </h1>
          </>
        )}
      </header>

      {/* Big stats card — bg-subtle / rounded-xl(20) / 24x22 padding */}
      {statsQuery.isLoading ? (
        <StatsCardSkeleton />
      ) : statsQuery.error ? (
        <ErrorCard
          title={t('home.statsErrorTitle')}
          message={toUserMessage(statsQuery.error)}
        />
      ) : stats ? (
        <StatsCard stats={stats} />
      ) : null}

      {/* CTA — 풀너비 PrimaryButton (▶ 아이콘 + 텍스트) */}
      <PrimaryButton
        aria-label={t('home.ctaStartSession')}
        onClick={() => router.push('/sessions/new')}
      >
        <span className="inline-flex items-center gap-2">
          <CrimpIcon.play s={18} />
          {t('home.ctaStartSession')}
        </span>
      </PrimaryButton>

      {/* Feed entry — Phase 1.5 임시 진입 카드. BottomTabs 도입 시 제거 예정. */}
      <Link
        href="/feed"
        aria-label={t('feed.entryCardTitle')}
        className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-bg p-4 transition-transform duration-fast ease-standard hover:bg-subtle active:scale-[0.99]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-ink">
            <CrimpIcon.feed s={20} />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="truncate text-body font-bold tracking-[-0.02em] text-text">
              {t('feed.entryCardTitle')}
            </p>
            <p className="truncate text-caption font-medium text-text-3">
              {t('feed.entryCardDescription')}
            </p>
          </div>
        </div>
        <CrimpIcon.chevR s={18} className="shrink-0 text-text-3" />
      </Link>

      {/* Recent sessions — title 18px + "전체" link, list border-hairline cards */}
      <section
        aria-labelledby="home-recent-sessions"
        className="flex flex-col gap-2.5 pt-2"
      >
        <div className="flex items-baseline justify-between px-1">
          <h2
            id="home-recent-sessions"
            className="text-title font-bold tracking-[-0.02em] text-text"
          >
            {t('home.recentSessionsTitle')}
          </h2>
          <Link
            href="/sessions"
            className="text-caption font-semibold text-text-3 transition-colors duration-fast ease-standard hover:text-text-2"
          >
            {t('home.recentSessionsViewAll')}
          </Link>
        </div>

        {sessionsQuery.isLoading ? (
          <RecentSessionsSkeleton />
        ) : sessionsQuery.error ? (
          <ErrorCard
            title={t('home.recentSessionsErrorTitle')}
            message={toUserMessage(sessionsQuery.error)}
          />
        ) : recentSessions.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {recentSessions.map((s) => (
              <li key={s.extId}>
                <RecentSessionCard session={s} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function WeeklyHeadline({ weekSends }: { weekSends: number }): JSX.Element {
  // i18n 템플릿 `{{count}}` 자리에 accent 색을 입힌 span 을 끼워 넣는다.
  const template = t('home.weeklyHeadline');
  const [before, after] = template.split('{{count}}');
  return (
    <>
      {before ?? ''}
      <span className="tabular-nums text-accent-ink">{weekSends}</span>
      {after ?? ''}
    </>
  );
}

/**
 * 큰 통계 카드 — mock restrained variant 그대로 (`screens-ios.jsx:88-99`).
 *
 * 좌: 완등 56px + "완등 · 세션 N회" 13px caption
 * 우: 최고 그레이드 32px (accent) + "최고 그레이드" 13px caption
 */
function StatsCard({ stats }: { stats: MeStats }): JSX.Element {
  const weekRangeLabel = formatWeekRange(stats.weekRange);
  const topGrade = stats.topGrade ?? t('common.empty');

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-subtle p-6 shadow-xs">
      <p className="text-body font-semibold text-text-3">
        {weekRangeLabel}
      </p>
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p
            className="font-extrabold tabular-nums tracking-[-0.05em] text-text"
            style={{ fontSize: 56, lineHeight: 1 }}
          >
            {stats.weekSends}
          </p>
          <p className="text-body font-semibold text-text-3">
            {t('home.statsWeekSendsLabel')} · {t('home.statsWeekSessionsLabel')}{' '}
            <span className="tabular-nums">{stats.weekSessions}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 text-right">
          <p
            className="font-extrabold tracking-[-0.04em] text-accent-ink"
            style={{ fontSize: 32, lineHeight: 1 }}
          >
            {topGrade}
          </p>
          <p className="text-body font-semibold text-text-3">
            {t('home.statsTopGradeLabel')}
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * weekRange `{start, end}` 를 "이번 주 · 4월 20일–26일" 형태로 포맷.
 * 잘못된 입력이면 "이번 주" fallback.
 */
function formatWeekRange(range: { start: string; end: string }): string {
  const fallback = t('home.statsWeekRangeFallback');
  try {
    const s = new Date(range.start);
    const e = new Date(range.end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return fallback;
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${fallback} · ${fmt(s)} – ${fmt(e)}`;
  } catch {
    return fallback;
  }
}

function StatsCardSkeleton(): JSX.Element {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="flex flex-col gap-3 rounded-xl bg-subtle p-6 shadow-xs"
    >
      <Skeleton h={14} w="40%" />
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton h={56} w={96} />
          <Skeleton h={14} w={120} />
        </div>
        <div className="flex flex-col items-end gap-2">
          <Skeleton h={32} w={72} />
          <Skeleton h={14} w={80} />
        </div>
      </div>
    </div>
  );
}

function RecentSessionsSkeleton(): JSX.Element {
  return (
    <ul aria-busy="true" aria-live="polite" className="flex flex-col gap-2.5">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="rounded-2xl border border-hairline bg-bg p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <Skeleton h={16} w="55%" />
            <Skeleton h={14} w={48} r={10} />
          </div>
          <div className="mt-2.5">
            <Skeleton h={12} w="35%" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ErrorCard({
  title,
  message,
}: {
  title: string;
  message: string;
}): JSX.Element {
  return (
    <div role="alert" className="rounded-2xl bg-subtle p-5 shadow-xs">
      <p className="text-title font-bold text-danger">{title}</p>
      <p className="mt-1 text-body text-text-2">{message}</p>
    </div>
  );
}

function EmptyState(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-hairline bg-bg px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-subtle text-accent-ink">
        <CrimpIcon.flame s={28} />
      </div>
      <p className="text-title font-bold text-text">
        {t('home.emptyTitle')}
      </p>
      <p className="text-caption text-text-2">
        {t('home.emptyDescription')}
      </p>
    </div>
  );
}

/**
 * 최근 세션 카드 — mock `screens-ios.jsx:121-140` 의 padding/gap 대응.
 * border-hairline + rounded-2xl + bg-bg (subtle 아님) — list item.
 */
function RecentSessionCard({ session }: { session: Session }): JSX.Element {
  const dateLabel = formatDateShort(session.startedAt);
  const ongoing = !session.endedAt;
  return (
    <Link
      href={`/sessions/${encodeURIComponent(session.extId)}`}
      className="flex items-center gap-3 rounded-2xl border border-hairline bg-bg p-4 transition-colors duration-fast ease-standard hover:bg-subtle active:scale-[0.99]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-subtle text-text-3">
        <CrimpIcon.pin s={20} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-body font-bold tracking-[-0.02em] text-text">
          {session.gymNameRaw ?? t('session.list.itemGymFallback')}
        </p>
        <p className="text-caption font-medium text-text-3 tabular-nums">
          {dateLabel}
        </p>
      </div>
      {ongoing ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-caption font-bold text-accent-ink">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-accent"
          />
          {t('session.detail.ongoingBadge')}
        </span>
      ) : (
        <CrimpIcon.chevR s={18} className="shrink-0 text-text-3" />
      )}
    </Link>
  );
}

function formatDateShort(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
  } catch {
    return iso;
  }
}
