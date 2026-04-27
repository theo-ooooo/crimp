'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  CrimpIcon,
  PrimaryButton,
  SecondaryButton,
  Skeleton,
} from '@/components/primitives';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useSessionsQuery } from '@/hooks/useSessions';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import type { Session } from '@/lib/schemas/session';

/**
 * `/sessions` — 내 세션 목록.
 *
 * Toss 톤 리디자인:
 * - 헤더: h1 타이틀 + 이번 달 완등 수 서브카피
 * - 카드: `bg-subtle`, rounded-2xl, 테두리 없음, 여유로운 패딩
 * - 빈 상태: 아이콘 + 안내 + 풀너비 PrimaryButton
 * - 로딩: Skeleton 플레이스홀더 3개
 *
 * 기존 훅·에러 처리·커서 페이지네이션·hydration 가드는 그대로 유지한다.
 */
export default function SessionsPage(): JSX.Element {
  const accessToken = useRequireAuth();
  const {
    data,
    error,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useSessionsQuery(accessToken);

  // hydration 전 OR 토큰 없음(redirect 대기) → 동일 skeleton.
  if (!accessToken) {
    return <HydrationGate />;
  }

  const sessions: Session[] = data?.pages.flatMap((p) => p.items) ?? [];
  const monthlySessions = countMonthlyEndedSessions(sessions);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 bg-bg px-6 py-10">
      <header className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1 font-extrabold text-text">
              {t('session.list.title')}
            </h1>
            <p className="text-body font-medium text-text-3 tabular-nums">
              {t('session.list.subtitleMonth').replace(
                '{{count}}',
                String(monthlySessions),
              )}
            </p>
          </div>
          <Link
            href="/sessions/new"
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-accent px-4 text-body font-bold text-white shadow-xs transition-transform duration-fast ease-standard active:scale-[0.98]"
          >
            <CrimpIcon.plus s={16} />
            {t('session.list.newButton')}
          </Link>
        </div>
      </header>

      {isLoading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorCard
          title={t('session.list.errorTitle')}
          message={toUserMessage(error)}
        />
      ) : sessions.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((s) => (
            <li key={s.extId}>
              <SessionListCard session={s} />
            </li>
          ))}
        </ul>
      )}

      {hasNextPage ? (
        <div className="mx-auto w-full max-w-xs">
          <SecondaryButton
            onClick={() => {
              void fetchNextPage();
            }}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage
              ? t('common.loading')
              : t('session.list.loadMore')}
          </SecondaryButton>
        </div>
      ) : null}
    </main>
  );
}

function HydrationGate(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 bg-bg px-6">
      <Skeleton h={32} w="40%" />
      <Skeleton h={16} w="65%" />
      <div className="mt-6 flex flex-col gap-3">
        <Skeleton h={96} r={20} />
        <Skeleton h={96} r={20} />
      </div>
    </main>
  );
}


function ListSkeleton(): JSX.Element {
  return (
    <ul className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="rounded-2xl bg-subtle p-5 shadow-xs"
        >
          <div className="flex items-center justify-between gap-3">
            <Skeleton h={18} w="45%" />
            <Skeleton h={18} w={60} r={10} />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Skeleton h={14} w="30%" />
            <Skeleton h={14} w="25%" />
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
    <div
      role="alert"
      className="rounded-2xl bg-subtle p-5 shadow-xs"
    >
      <p className="text-title font-bold text-danger">{title}</p>
      <p className="mt-1 text-body text-text-2">{message}</p>
    </div>
  );
}

function EmptyState(): JSX.Element {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-2xl bg-subtle px-6 py-14 text-center shadow-xs">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg text-accent">
        <CrimpIcon.target s={28} />
      </div>
      <p className="text-body font-semibold text-text-2">
        {t('session.list.empty')}
      </p>
      <div className="w-full max-w-xs">
        <PrimaryButton
          aria-label={t('session.list.emptyCtaStart')}
          onClick={() => router.push('/sessions/new')}
        >
          <span className="inline-flex items-center gap-2">
            <CrimpIcon.play s={16} />
            {t('session.list.emptyCtaStart')}
          </span>
        </PrimaryButton>
      </div>
    </div>
  );
}

function SessionListCard({ session }: { session: Session }): JSX.Element {
  const ongoing = !session.endedAt;
  const dateLabel = formatDateShort(session.startedAt);
  const timeLabel = formatTime(session.startedAt);
  const durationLabel = ongoing
    ? t('session.list.itemOngoing')
    : formatDurationMinutes(session.durationMin);

  return (
    <Link
      href={`/sessions/${encodeURIComponent(session.extId)}`}
      className="block rounded-2xl bg-subtle p-5 shadow-xs transition-transform duration-fast ease-standard hover:shadow-sm active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-title font-bold text-text">
            {session.gymNameRaw ?? t('session.list.itemGymFallback')}
          </p>
          <p className="text-caption font-medium text-text-3 tabular-nums">
            {dateLabel} · {timeLabel}
          </p>
        </div>
        <StatusBadge ongoing={ongoing} label={durationLabel} />
      </div>
    </Link>
  );
}

function StatusBadge({
  ongoing,
  label,
}: {
  ongoing: boolean;
  label: string;
}): JSX.Element {
  if (ongoing) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-caption font-bold text-accent-ink">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-chip px-3 py-1 text-caption font-semibold text-text-2 tabular-nums">
      {label}
    </span>
  );
}

/**
 * 이번 달에 시작하고 종료된(=완료된) 세션 수를 집계한다.
 *
 * 주의: 이 값은 "완등(SEND/FLASH/ONSIGHT) 시도 수" 가 아니다.
 * 시도 단위 SEND 집계는 현재 목록 API 범위 밖이라, Phase 1 에서는
 * "완료된 세션 수" 근사치를 홈 카피에 노출한다.
 * 정확한 월간 집계는 `GET /me/stats?period=month` 도입(F1, 별도 PR) 후 교체.
 */
function countMonthlyEndedSessions(sessions: Session[]): number {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return sessions.reduce((acc, s) => {
    if (!s.endedAt) return acc;
    const d = new Date(s.startedAt);
    if (Number.isNaN(d.getTime())) return acc;
    return d.getFullYear() === y && d.getMonth() === m ? acc + 1 : acc;
  }, 0);
}

function formatDurationMinutes(duration: number | null): string {
  if (duration === null) return t('common.empty');
  const minutes = Math.max(0, duration);
  return t('session.list.itemDurationMinutes').replace(
    '{{minutes}}',
    String(minutes),
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

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
