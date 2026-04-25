'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  BigStat,
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
 * `/` — 홈 (Toss 톤 리디자인).
 *
 * 상태 분기:
 * - hydration 전: 빈 placeholder (SSR mismatch 방지)
 * - 로그아웃: 브랜드 헤드라인 + 로그인 CTA
 * - 로그인 + 로딩: 스켈레톤
 * - 로그인 + 데이터: 인사 + 큰 통계 카드 + 세션 시작 CTA + 최근 세션 3개
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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 bg-bg px-6 py-10">
      <Skeleton h={20} w="35%" />
      <Skeleton h={32} w="70%" />
      <Skeleton h={220} r={28} />
      <Skeleton h={56} r={16} />
    </main>
  );
}

function LoggedOut(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 bg-bg px-6 py-10">
      <p className="text-caption font-bold uppercase tracking-[0.3em] text-accent">
        {t('common.brand')}
      </p>
      <h1 className="text-h1 font-extrabold leading-snug text-text">
        {t('home.loginPromptTitle')}
      </h1>
      <p className="text-body text-text-2">
        {t('home.loginPromptDescription')}
      </p>
      <div className="mt-2">
        {/*
          `/login` 라우트는 후속 PR 에서 추가 예정. 현재는 typed-routes 를 우회하기 위해
          `<a>` 로 placeholder 링크만 둔다. 라우트 생성 후 `<Link>` + 타입 추론으로 교체.
        */}
        <a
          href="/login"
          aria-label={t('home.loginCta')}
          className="inline-flex h-14 w-full items-center justify-center rounded-lg bg-accent text-[17px] font-bold tracking-[-0.02em] text-white transition-transform duration-fast ease-standard active:scale-[0.98]"
        >
          {t('home.loginCta')}
        </a>
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
  const greetingPrimary = t('home.greeting').replace(
    '{{nickname}}',
    nickname,
  );

  const stats = statsQuery.data;
  const recentSessions: Session[] =
    sessionsQuery.data?.pages.flatMap((p) => p.items).slice(0, 3) ?? [];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-7 bg-bg px-6 py-10">
      {/* Greeting */}
      <header className="flex flex-col gap-2">
        {statsQuery.isLoading ? (
          <>
            <Skeleton h={28} w="55%" />
            <Skeleton h={28} w="80%" />
          </>
        ) : (
          <h1 className="text-h1 font-extrabold leading-snug tracking-[-0.04em] text-text">
            {greetingPrimary}
            <br />
            <WeeklyHeadline weekSends={stats?.weekSends ?? 0} />
          </h1>
        )}
      </header>

      {/* Big stats card */}
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

      {/* CTA */}
      <PrimaryButton
        aria-label={t('home.ctaStartSession')}
        onClick={() => router.push('/sessions/new')}
      >
        <span className="inline-flex items-center gap-2">
          <CrimpIcon.play s={18} />
          {t('home.ctaStartSession')}
        </span>
      </PrimaryButton>

      {/* Recent sessions */}
      <section
        aria-labelledby="home-recent-sessions"
        className="flex flex-col gap-3"
      >
        <div className="flex items-baseline justify-between">
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
      <span className="tabular-nums text-accent">{weekSends}</span>
      {after ?? ''}
    </>
  );
}

function StatsCard({ stats }: { stats: MeStats }): JSX.Element {
  return (
    <section
      aria-label={t('home.statsWeekSendsLabel')}
      className="flex flex-col gap-5 rounded-2xl bg-subtle p-6 shadow-xs"
    >
      <BigStat
        scale="xl"
        label={t('home.statsWeekSendsLabel')}
        value={stats.weekSends}
      />
      <div className="h-px bg-hairline" aria-hidden="true" />
      <div className="grid grid-cols-3 gap-3">
        <SmallStat
          label={t('home.statsTotalSessionsLabel')}
          value={stats.totalSessions}
        />
        <SmallStat
          label={t('home.statsTopGradeLabel')}
          value={stats.topGrade ?? t('common.empty')}
          accent={stats.topGrade !== null}
        />
        <SmallStat
          label={t('home.statsTotalSendsLabel')}
          value={stats.totalSends}
        />
      </div>
    </section>
  );
}

function SmallStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[12px] font-semibold tracking-[-0.01em] text-text-3">
        {label}
      </p>
      <p
        className={`text-h2 font-extrabold tracking-[-0.03em] tabular-nums ${
          accent ? 'text-accent' : 'text-text'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatsCardSkeleton(): JSX.Element {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="flex flex-col gap-5 rounded-2xl bg-subtle p-6 shadow-xs"
    >
      <div className="flex flex-col gap-3">
        <Skeleton h={14} w="35%" />
        <Skeleton h={72} w="55%" />
      </div>
      <div className="h-px bg-hairline" aria-hidden="true" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton h={12} w="65%" />
            <Skeleton h={24} w="50%" />
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentSessionsSkeleton(): JSX.Element {
  return (
    <ul aria-busy="true" aria-live="polite" className="flex flex-col gap-2.5">
      {[0, 1, 2].map((i) => (
        <li key={i} className="rounded-2xl bg-subtle p-4 shadow-xs">
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-subtle px-6 py-12 text-center shadow-xs">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg text-accent">
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

function RecentSessionCard({ session }: { session: Session }): JSX.Element {
  const dateLabel = formatDateShort(session.startedAt);
  const ongoing = !session.endedAt;
  return (
    <Link
      href={`/sessions/${encodeURIComponent(session.extId)}`}
      className="block rounded-2xl bg-subtle p-4 shadow-xs transition-transform duration-fast ease-standard hover:shadow-sm active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-body font-bold text-text">
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
      </div>
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
