'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  CrimpIcon,
  GradeBadge,
  PrimaryButton,
  ResultMark,
  SecondaryButton,
  Skeleton,
} from '@/components/primitives';
import { LogAttemptSheet } from '@/components/session/LogAttemptSheet';
import { useAttemptsQuery } from '@/hooks/useAttempts';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useEndSession, useSessionQuery } from '@/hooks/useSessions';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import { type Attempt } from '@/lib/schemas/attempt';
import type { Session } from '@/lib/schemas/session';

/**
 * `/sessions/[extId]` — 세션 상세 + 시도 로그 화면.
 *
 * v2 라임 리디자인:
 * - 상단 메타 카드: 디스플레이 스케일 타이머 (`text-display` · `tabular-nums`) +
 *   캡션(암장·시작시각) + 상태 Pill (LIVE/종료됨)
 * - 통계 타일 3개 (완등 / 시도 / 최고 그레이드) — `bg-subtle` 카드
 * - "시도 기록" PrimaryButton — 탭 시 `LogAttemptSheet` (바텀시트) 가 열림.
 *   기존 인라인 폼 (`LogAttemptForm`) 은 v2 시트 패턴으로 대체.
 * - 사진/영상 첨부는 모바일 전용 (PR-W1). 웹 LogAttemptSheet 에는 카메라 CTA 없음.
 * - 타임라인: ResultMark + GradeBadge + 시각 + 메모 한 줄 카드
 * - 하단 고정 SecondaryButton "세션 종료" (진행 중인 세션 한정)
 *
 * 모든 훅·에러 처리·캐시 무효화는 기존 구현을 그대로 사용.
 */
export default function SessionDetailPage(): JSX.Element {
  const params = useParams<{ extId: string }>();
  const extId = params?.extId;
  const accessToken = useRequireAuth();

  const sessionQuery = useSessionQuery(accessToken, extId);
  const attemptsQuery = useAttemptsQuery(accessToken, extId);
  const endSession = useEndSession(accessToken);

  // v2 시트 패턴 — LogAttemptSheet 토글 상태. (PR-W1: 웹 카메라 제거 — 모바일 전용)
  const [logSheetOpen, setLogSheetOpen] = useState<boolean>(false);

  // hydration 전 OR 토큰 없음(redirect 대기) → 동일 skeleton.
  if (!accessToken) {
    return <HydrationGate />;
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
  const attempts = attemptsQuery.data?.items ?? [];
  const canEnd = Boolean(session && !session.endedAt);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 bg-bg px-6 pb-32 pt-10">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/sessions"
          aria-label={t('common.back')}
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
        <PrimaryButton
          type="button"
          onClick={() => setLogSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={logSheetOpen}
        >
          <CrimpIcon.plus s={18} className="mr-1.5" />
          {t('session.log.openCta')}
        </PrimaryButton>
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
        // [PR #108 리뷰 B1] BottomTabs (모바일 z-40) 와 겹치지 않게 모바일에선 56px 위로
        // 띄움. 데스크탑(md+)은 BottomTabs 가 hidden 이라 bottom-0 그대로.
        <div
          className="fixed inset-x-0 bottom-14 z-20 bg-gradient-to-t from-bg via-bg/95 to-transparent px-6 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] md:bottom-0"
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

      {/* v2 LogAttemptSheet — 진행 중 세션에서만 노출. */}
      {logSheetOpen && session && !session.endedAt ? (
        <LogAttemptSheet
          accessToken={accessToken}
          sessionExtId={extId}
          onClose={() => setLogSheetOpen(false)}
        />
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

  // 타이머가 1초마다 리렌더되므로 attempts 기반 파생값과
  // 시작시각 캡션은 useMemo 로 캐싱한다.
  const caption = useMemo(() => {
    const startedAt = formatDateTimeShort(session.startedAt);
    return t('session.detail.metaCaption')
      .replace('{{gym}}', gym)
      .replace('{{startedAt}}', startedAt);
  }, [gym, session.startedAt]);

  const sends = useMemo(
    () =>
      attempts.filter(
        (a) =>
          a.result === 'SEND' || a.result === 'FLASH' || a.result === 'ONSIGHT',
      ).length,
    [attempts],
  );
  const tries = useMemo(() => attempts.length, [attempts]);
  const topGrade = useMemo(() => pickTopGrade(attempts), [attempts]);

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
          'mt-1 text-h2 font-extrabold tabular-nums ' +
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

/**
 * SEND/FLASH/ONSIGHT 시도 중 "최고" 그레이드 문자열을 반환.
 *
 * 비교 우선순위:
 *   1) `gradeNumeric` 이 있는 후보를 null 후보보다 우선한다.
 *   2) 동일 타입(numeric ↔ numeric)끼리는 값이 큰 쪽이 승.
 *   3) numeric 이 전부 null 이면 `parseGradeNumeric` 로 V·YDS 문자열에서 추정.
 *   4) 그래도 null 이면 문자열 사전순으로 비교(순서 의존 제거).
 *
 * 정확한 순서는 백엔드가 `gradeNumeric` 을 항상 채워줄 때 보장된다
 * (V·YDS 이외 스케일 — Fontainebleau 등 — 이 들어오는 날 F2 도메인 유틸
 * `web/src/lib/grade.ts` 로 이동해 앱/웹 공유).
 */
function pickTopGrade(attempts: Attempt[]): string | null {
  let bestStr: string | null = null;
  let bestNum: number | null = null;
  for (const a of attempts) {
    if (a.result !== 'SEND' && a.result !== 'FLASH' && a.result !== 'ONSIGHT') {
      continue;
    }
    const candidate = a.gradeValue;
    if (!candidate) continue;
    const num = a.gradeNumeric ?? parseGradeNumeric(candidate);

    if (bestStr === null) {
      bestStr = candidate;
      bestNum = num;
      continue;
    }

    if (num !== null && bestNum === null) {
      // 숫자로 비교 가능한 후보가 우선한다.
      bestStr = candidate;
      bestNum = num;
      continue;
    }
    if (num !== null && bestNum !== null && num > bestNum) {
      bestStr = candidate;
      bestNum = num;
      continue;
    }
    if (num === null && bestNum === null && candidate > bestStr) {
      // 숫자 비교 불가 → 사전순. 순서 의존 제거.
      bestStr = candidate;
    }
  }
  return bestStr;
}

/**
 * 그레이드 문자열 → 비교용 숫자.
 *
 * - V-scale: `V\d+` → 뒤 숫자. 예) `V5` → 5, `V10+` → 10.
 * - YDS   : `5.<minor><letter?>` → `major + minor/100 + letterOffset/400`.
 *   예) `5.11a` → 11.0025, `5.11d` → 11.01, `5.12a` → 12.0025, `5.12b` → 12.005.
 *   V-스케일(수치: 0~17)와 YDS(수치: 5~16) 의 스케일이 다르므로 서로 다른 단위로
 *   기록된 시도는 정확히 비교되지 않지만, 같은 스케일끼리는 정렬이 보장된다.
 *
 * 백엔드 `gradeNumeric` 이 채워져 있을 때는 이 함수가 불리지 않는다.
 */
function parseGradeNumeric(v: string): number | null {
  const vMatch = /^V(\d+)/i.exec(v);
  if (vMatch && vMatch[1]) {
    const parsed = Number.parseInt(vMatch[1], 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  const ydsMatch = /^5\.(\d+)([a-d])?/i.exec(v);
  if (ydsMatch && ydsMatch[1]) {
    const minor = Number.parseInt(ydsMatch[1], 10);
    if (Number.isNaN(minor)) return null;
    const letter = ydsMatch[2]?.toLowerCase();
    const letterOffset =
      letter === 'a' ? 0 : letter === 'b' ? 1 : letter === 'c' ? 2 : letter === 'd' ? 3 : 0;
    return 5 + minor / 100 + letterOffset / 400;
  }
  return null;
}

/**
 * `YYYY? Mon D, HH:MM` 형식. 올해의 날짜면 연도 생략, 다른 해면 연도 포함.
 * 오래된 세션 상세에서 시점이 모호하게 보이는 문제(리뷰 I6)를 방지한다.
 */
function formatDateTimeShort(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const nowYear = new Date().getFullYear();
    const sameYear = d.getFullYear() === nowYear;
    return d.toLocaleString(undefined, {
      ...(sameYear ? {} : { year: 'numeric' }),
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
