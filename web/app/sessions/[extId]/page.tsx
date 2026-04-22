'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  CrimpIcon,
  GradeBadge,
  ResultMark,
  SecondaryButton,
  Skeleton,
} from '@/components/primitives';
import { useAttemptsQuery, useLogAttempt } from '@/hooks/useAttempts';
import { useEndSession, useSessionQuery } from '@/hooks/useSessions';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import {
  ATTEMPT_RESULTS,
  type Attempt,
  type AttemptResult,
} from '@/lib/schemas/attempt';
import type { Session } from '@/lib/schemas/session';
import { useAccessToken, useTokenStore } from '@/store/tokenStore';

/**
 * `/sessions/[extId]` — 세션 상세 + 시도 로그 화면.
 *
 * Toss 톤 리디자인:
 * - 상단 메타 카드: 디스플레이 스케일 타이머 (`text-display` · `tabular-nums`) +
 *   캡션(암장·시작시각) + 상태 Pill (LIVE/종료됨)
 * - 통계 타일 3개 (완등 / 시도 / 최고 그레이드) — `bg-subtle` 카드
 * - 시도 기록 인라인 폼: ResultMark 선택 버튼, 그레이드·시도·메모 채움형 입력
 * - 타임라인: ResultMark + GradeBadge + 시각 + 메모 한 줄 카드
 * - 하단 고정 SecondaryButton "세션 종료" (진행 중인 세션 한정)
 *
 * 모든 훅·에러 처리·캐시 무효화는 기존 구현을 그대로 사용.
 */
export default function SessionDetailPage(): JSX.Element {
  const params = useParams<{ extId: string }>();
  const extId = params?.extId;
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useAccessToken();

  const sessionQuery = useSessionQuery(accessToken, extId);
  const attemptsQuery = useAttemptsQuery(accessToken, extId);
  const endSession = useEndSession(accessToken);

  if (!hydrated) {
    return <HydrationGate />;
  }

  if (!accessToken) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 bg-bg px-6">
        <h1 className="text-h1 font-extrabold text-text">
          {t('session.detail.loginRequiredTitle')}
        </h1>
        <p className="text-body text-text-2">
          {t('session.detail.loginRequiredDescription')}
        </p>
      </main>
    );
  }

  if (!extId) {
    // Next.js dynamic route 에서 extId 가 누락될 일은 사실상 없지만 안전망.
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 bg-bg px-6">
        <p role="alert" className="text-body text-danger">
          {t('session.detail.errorTitle')}
        </p>
      </main>
    );
  }

  const session = sessionQuery.data ?? null;
  const attempts = attemptsQuery.data?.data ?? [];
  const canEnd = Boolean(session && !session.endedAt);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 bg-bg px-6 pb-32 pt-10">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/sessions"
          aria-label={t('common.cancel')}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-text-2 transition-colors duration-fast ease-standard hover:bg-subtle"
        >
          <CrimpIcon.chevL s={22} />
        </Link>
        <h1 className="text-title font-bold text-text">
          {t('session.detail.title')}
        </h1>
        <div className="h-10 w-10" aria-hidden="true" />
      </header>

      {sessionQuery.isLoading ? (
        <MetaSkeleton />
      ) : sessionQuery.error ? (
        <ErrorCard
          title={t('session.detail.errorTitle')}
          message={toUserMessage(sessionQuery.error)}
        />
      ) : session ? (
        <MetaCard session={session} attempts={attempts} />
      ) : null}

      {session && !session.endedAt ? (
        <LogAttemptForm accessToken={accessToken} sessionExtId={extId} />
      ) : null}

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-h2 font-bold tracking-[-0.03em] text-text">
            {t('session.detail.timelineTitle')}
          </h2>
          {attempts.length > 0 ? (
            <span className="text-body font-semibold text-text-3 tabular-nums">
              {attempts.length}
            </span>
          ) : null}
        </div>

        {attemptsQuery.isLoading ? (
          <TimelineSkeleton />
        ) : attemptsQuery.error ? (
          <p role="alert" className="text-body text-danger">
            {toUserMessage(attemptsQuery.error)}
          </p>
        ) : attempts.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {attempts.map((a) => (
              <li key={a.extId}>
                <AttemptCard attempt={a} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl bg-subtle px-6 py-10 text-center shadow-xs">
            <p className="text-body font-semibold text-text-2">
              {t('session.detail.attemptsEmpty')}
            </p>
          </div>
        )}
      </section>

      {canEnd && session ? (
        <div
          className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-bg via-bg/95 to-transparent px-6 pb-8 pt-4"
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-2">
            <SecondaryButton
              type="button"
              onClick={() => {
                endSession.endSession(session.extId).catch(() => {
                  /* 에러는 `endSession.error` 로 드러남 */
                });
              }}
              disabled={endSession.isPending}
            >
              {endSession.isPending
                ? t('session.detail.ending')
                : t('session.detail.endButton')}
            </SecondaryButton>
            {endSession.error ? (
              <p role="alert" className="text-caption text-danger">
                {toUserMessage(endSession.error)}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}

function HydrationGate(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 bg-bg px-6 py-10">
      <Skeleton h={32} w="40%" />
      <Skeleton h={160} r={24} />
      <Skeleton h={96} r={16} />
      <Skeleton h={96} r={16} />
    </main>
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

function MetaSkeleton(): JSX.Element {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-subtle p-6 shadow-xs">
      <Skeleton h={14} w="50%" />
      <Skeleton h={72} w="60%" />
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Skeleton h={64} r={16} />
        <Skeleton h={64} r={16} />
        <Skeleton h={64} r={16} />
      </div>
    </section>
  );
}

function TimelineSkeleton(): JSX.Element {
  return (
    <ul className="flex flex-col gap-2" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="rounded-2xl bg-subtle p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <Skeleton w={28} h={28} r={14} />
            <div className="flex-1">
              <Skeleton h={14} w="50%" />
              <div className="mt-2">
                <Skeleton h={12} w="30%" />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function MetaCard({
  session,
  attempts,
}: {
  session: Session;
  attempts: Attempt[];
}): JSX.Element {
  const ongoing = !session.endedAt;
  const elapsed = useElapsed(session.startedAt, session.endedAt);
  const gym = session.gymNameRaw ?? t('session.list.itemGymFallback');
  const startedAt = formatDateTimeShort(session.startedAt);
  const caption = t('session.detail.metaCaption')
    .replace('{{gym}}', gym)
    .replace('{{startedAt}}', startedAt);

  const sends = attempts.filter(
    (a) => a.result === 'SEND' || a.result === 'FLASH' || a.result === 'ONSIGHT',
  ).length;
  const tries = attempts.length;
  const topGrade = pickTopGrade(attempts);

  return (
    <section className="flex flex-col gap-5 rounded-2xl bg-subtle p-6 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-caption font-semibold uppercase tracking-[0.08em] text-text-3">
            {t('session.detail.elapsedLabel')}
          </p>
          <p className="text-body font-medium text-text-3">{caption}</p>
        </div>
        <StatusPill ongoing={ongoing} />
      </div>

      <p className="text-display font-extrabold tabular-nums text-text">
        {elapsed}
      </p>

      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label={t('session.detail.statsSends')}
          value={sends}
          accent
        />
        <StatTile
          label={t('session.detail.statsAttempts')}
          value={tries}
        />
        <StatTile
          label={t('session.detail.statsTopGrade')}
          value={topGrade ?? t('common.empty')}
        />
      </div>
    </section>
  );
}

function StatusPill({ ongoing }: { ongoing: boolean }): JSX.Element {
  if (ongoing) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-caption font-bold text-accent-ink">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
        {t('session.detail.ongoingBadge')}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-chip px-3 py-1 text-caption font-semibold text-text-2">
      {t('session.detail.endedBadge')}
    </span>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}): JSX.Element {
  return (
    <div className="rounded-xl bg-bg px-4 py-3 shadow-xs">
      <p className="text-caption font-semibold text-text-3">{label}</p>
      <p
        className={
          'mt-1 text-2xl font-extrabold tracking-[-0.03em] tabular-nums ' +
          (accent ? 'text-accent' : 'text-text')
        }
      >
        {value}
      </p>
    </div>
  );
}

function AttemptCard({ attempt }: { attempt: Attempt }): JSX.Element {
  const kindLabel = t(`attempt.result.${attempt.result}` as const);
  const time = formatTimeShort(attempt.loggedAt);
  return (
    <article className="flex gap-4 rounded-2xl bg-subtle p-4 shadow-xs">
      <div className="pt-0.5">
        <ResultMark kind={attempt.result} size={28} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {attempt.gradeValue ? (
            <GradeBadge v={attempt.gradeValue} size="sm" />
          ) : null}
          <span className="text-caption font-bold uppercase tracking-[0.08em] text-text-3">
            {kindLabel}
          </span>
          {attempt.attempts > 1 ? (
            <span className="text-caption font-semibold text-text-3 tabular-nums">
              ×{attempt.attempts}
            </span>
          ) : null}
          <span className="flex-1" />
          <span className="text-caption font-medium text-text-3 tabular-nums">
            {time}
          </span>
        </div>
        {attempt.note ? (
          <p className="text-body font-medium text-text-2">{attempt.note}</p>
        ) : null}
      </div>
    </article>
  );
}

function LogAttemptForm({
  accessToken,
  sessionExtId,
}: {
  accessToken: string;
  sessionExtId: string;
}): JSX.Element {
  const [result, setResult] = useState<AttemptResult>('SEND');
  const [attemptsCount, setAttemptsCount] = useState<number>(1);
  const [grade, setGrade] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const mutation = useLogAttempt(accessToken, sessionExtId);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate(
      {
        result,
        attempts: Math.max(1, Math.min(999, Math.floor(attemptsCount) || 1)),
        gradeValue: grade.trim() ? grade.trim() : null,
        note: note.trim() ? note.trim() : null,
      },
      {
        onSuccess: () => {
          setGrade('');
          setNote('');
          setAttemptsCount(1);
          setResult('SEND');
        },
      },
    );
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-5 rounded-2xl bg-subtle p-6 shadow-xs"
    >
      <h3 className="text-h2 font-bold tracking-[-0.03em] text-text">
        {t('attempt.log.title')}
      </h3>

      <div className="flex flex-col gap-2">
        <span className="text-caption font-semibold text-text-3">
          {t('attempt.log.resultLabel')}
        </span>
        <div className="flex flex-wrap gap-2">
          {ATTEMPT_RESULTS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setResult(r)}
              aria-pressed={r === result}
              className={
                'inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold tracking-[-0.01em] transition-transform duration-fast ease-standard active:scale-[0.97] ' +
                (r === result
                  ? 'bg-text text-bg'
                  : 'bg-chip text-text-2 hover:bg-subtle-2')
              }
            >
              <ResultMark kind={r} size={18} />
              {t(`attempt.result.${r}` as const)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-caption font-semibold text-text-3">
            {t('attempt.log.gradeLabel')}
          </span>
          <input
            type="text"
            value={grade}
            maxLength={10}
            onChange={(e) => setGrade(e.target.value)}
            placeholder={t('attempt.log.gradePlaceholder')}
            className="h-11 w-full rounded-lg border-0 bg-subtle-2 px-3 text-body font-medium text-text placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-caption font-semibold text-text-3">
            {t('attempt.log.attemptsLabel')}
          </span>
          <input
            type="number"
            min={1}
            max={999}
            value={attemptsCount}
            onChange={(e) => setAttemptsCount(Number(e.target.value))}
            className="h-11 w-full rounded-lg border-0 bg-subtle-2 px-3 text-body font-medium text-text tabular-nums focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-caption font-semibold text-text-3">
          {t('attempt.log.noteLabel')}
        </span>
        <textarea
          value={note}
          maxLength={300}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('attempt.log.notePlaceholder')}
          rows={2}
          className="w-full resize-none rounded-lg border-0 bg-subtle-2 px-3 py-2.5 text-body font-medium text-text placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </label>

      {mutation.error ? (
        <div
          role="alert"
          className="rounded-xl bg-bg p-3 shadow-xs"
        >
          <p className="text-title font-bold text-danger">
            {t('attempt.log.errorTitle')}
          </p>
          <p className="mt-0.5 text-caption text-text-2">
            {toUserMessage(mutation.error)}
          </p>
        </div>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-bold text-white shadow-xs transition-transform duration-fast ease-standard active:scale-[0.98] disabled:bg-subtle-2 disabled:text-text-3"
        >
          <CrimpIcon.plus s={16} />
          {mutation.isPending
            ? t('attempt.log.submitting')
            : t('attempt.log.submit')}
        </button>
      </div>
    </form>
  );
}

/**
 * 시작·종료 사이의 경과 시간을 `HH:MM:SS` 로 변환. 진행 중 세션은 1초마다 갱신.
 */
function useElapsed(startedAt: string, endedAt: string | null): string {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (endedAt) return;
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [endedAt]);

  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return '--:--:--';
  const endRaw = endedAt ? new Date(endedAt).getTime() : now;
  const end = Number.isNaN(endRaw) ? now : endRaw;
  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function pickTopGrade(attempts: Attempt[]): string | null {
  let bestStr: string | null = null;
  let bestNum = -Infinity;
  for (const a of attempts) {
    if (a.result !== 'SEND' && a.result !== 'FLASH' && a.result !== 'ONSIGHT') {
      continue;
    }
    const candidate = a.gradeValue;
    if (!candidate) continue;
    const num = a.gradeNumeric ?? parseGradeNumeric(candidate);
    if (num !== null && num > bestNum) {
      bestNum = num;
      bestStr = candidate;
    } else if (num === null && bestStr === null) {
      bestStr = candidate;
    }
  }
  return bestStr;
}

function parseGradeNumeric(v: string): number | null {
  const m = /V(\d+)/i.exec(v);
  if (m && m[1]) {
    const parsed = Number.parseInt(m[1], 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function formatDateTimeShort(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatTimeShort(iso: string): string {
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
