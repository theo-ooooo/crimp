'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';

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
 * 세션 상세 + 시도 기록 화면.
 *
 * 시도 기록 폼은 세션이 종료되지 않은 경우에만 표시한다 (백엔드 제약이 아니라 UX 기본).
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
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6">
        <p className="text-sm text-neutral-400">{t('common.loading')}</p>
      </main>
    );
  }

  if (!accessToken) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6">
        <h1 className="text-2xl font-semibold">
          {t('session.detail.loginRequiredTitle')}
        </h1>
        <p className="text-sm text-neutral-400">
          {t('session.detail.loginRequiredDescription')}
        </p>
      </main>
    );
  }

  if (!extId) {
    // Next.js dynamic route 에서 extId 가 누락될 일은 사실상 없지만 안전망.
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6">
        <p className="text-sm text-red-400">{t('session.detail.errorTitle')}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('session.detail.title')}</h1>
      </header>

      {sessionQuery.isLoading ? (
        <p className="text-sm text-neutral-400">{t('common.loading')}</p>
      ) : sessionQuery.error ? (
        <div className="rounded border border-red-900/50 bg-red-950/30 p-4 text-sm">
          <p className="text-red-400">{t('session.detail.errorTitle')}</p>
          <p className="mt-1 text-neutral-400">
            {toUserMessage(sessionQuery.error)}
          </p>
        </div>
      ) : sessionQuery.data ? (
        <SessionCard
          session={sessionQuery.data}
          canEnd={!sessionQuery.data.endedAt}
          ending={endSession.isPending}
          onEnd={() => {
            endSession.endSession(sessionQuery.data!.extId).catch(() => {
              /* 에러는 `endSession.error` 로 드러남 */
            });
          }}
          endError={endSession.error}
        />
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          {t('session.detail.attemptsTitle')}
        </h2>

        {attemptsQuery.isLoading ? (
          <p className="text-sm text-neutral-400">{t('common.loading')}</p>
        ) : attemptsQuery.error ? (
          <p className="text-sm text-red-400">
            {toUserMessage(attemptsQuery.error)}
          </p>
        ) : attemptsQuery.data && attemptsQuery.data.data.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {attemptsQuery.data.data.map((a) => (
              <AttemptRow key={a.extId} attempt={a} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-400">
            {t('session.detail.attemptsEmpty')}
          </p>
        )}
      </section>

      {sessionQuery.data && !sessionQuery.data.endedAt ? (
        <LogAttemptForm accessToken={accessToken} sessionExtId={extId} />
      ) : null}
    </main>
  );
}

function SessionCard({
  session,
  canEnd,
  ending,
  onEnd,
  endError,
}: {
  session: Session;
  canEnd: boolean;
  ending: boolean;
  onEnd: () => void;
  endError: Error | null;
}): JSX.Element {
  return (
    <section className="flex flex-col gap-3 rounded border border-neutral-800 bg-neutral-950/50 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-neutral-100">
          {session.gymNameRaw ?? t('session.list.itemGymFallback')}
        </h2>
        <span
          className={
            session.endedAt
              ? 'rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400'
              : 'rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent'
          }
        >
          {session.endedAt
            ? t('session.detail.endedBadge')
            : t('session.detail.ongoingBadge')}
        </span>
      </div>

      <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 font-mono text-xs text-neutral-300">
        <dt className="text-neutral-500">{t('session.detail.labelStartedAt')}</dt>
        <dd>{formatDateTime(session.startedAt)}</dd>
        <dt className="text-neutral-500">{t('session.detail.labelEndedAt')}</dt>
        <dd>
          {session.endedAt ? formatDateTime(session.endedAt) : t('common.empty')}
        </dd>
        <dt className="text-neutral-500">{t('session.detail.labelDuration')}</dt>
        <dd>
          {session.durationMin === null
            ? t('common.empty')
            : t('session.list.itemDurationMinutes').replace(
                '{{minutes}}',
                String(Math.max(0, session.durationMin)),
              )}
        </dd>
        <dt className="text-neutral-500">{t('session.detail.labelNote')}</dt>
        <dd>{session.note ?? t('common.empty')}</dd>
        <dt className="text-neutral-500">
          {t('session.detail.labelCondition')}
        </dt>
        <dd>{session.condition ?? t('common.empty')}</dd>
      </dl>

      {canEnd ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onEnd}
            disabled={ending}
            className="self-start rounded border border-neutral-700 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
          >
            {ending ? t('session.detail.ending') : t('session.detail.endButton')}
          </button>
          {endError ? (
            <p className="text-xs text-red-400">{toUserMessage(endError)}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function AttemptRow({ attempt }: { attempt: Attempt }): JSX.Element {
  return (
    <li className="rounded border border-neutral-800 bg-neutral-950/40 p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-neutral-100">
          {t(`attempt.result.${attempt.result}` as const)}
        </span>
        <span className="font-mono text-xs text-neutral-500">
          {formatDateTime(attempt.loggedAt)}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-3 font-mono text-xs text-neutral-400">
        <span>{attempt.gradeValue ?? t('common.empty')}</span>
        <span>×{attempt.attempts}</span>
      </div>
      {attempt.note ? (
        <p className="mt-2 text-xs text-neutral-300">{attempt.note}</p>
      ) : null}
    </li>
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
      className="flex flex-col gap-3 rounded border border-neutral-800 bg-neutral-950/50 p-5"
    >
      <h3 className="text-sm font-semibold text-neutral-100">
        {t('attempt.log.title')}
      </h3>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-neutral-400">
          {t('attempt.log.resultLabel')}
        </span>
        <div className="flex flex-wrap gap-2">
          {ATTEMPT_RESULTS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setResult(r)}
              className={
                r === result
                  ? 'rounded border border-accent bg-accent/20 px-3 py-1 text-xs text-accent'
                  : 'rounded border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800'
              }
            >
              {t(`attempt.result.${r}` as const)}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-400">
          {t('attempt.log.attemptsLabel')}
        </span>
        <input
          type="number"
          min={1}
          max={999}
          value={attemptsCount}
          onChange={(e) => setAttemptsCount(Number(e.target.value))}
          className="w-24 rounded border border-neutral-800 bg-neutral-950/60 px-2 py-1 text-sm text-neutral-100 focus:border-accent focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-400">
          {t('attempt.log.gradeLabel')}
        </span>
        <input
          type="text"
          value={grade}
          maxLength={10}
          onChange={(e) => setGrade(e.target.value)}
          placeholder={t('attempt.log.gradePlaceholder')}
          className="rounded border border-neutral-800 bg-neutral-950/60 px-2 py-1 text-sm text-neutral-100 focus:border-accent focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-400">
          {t('attempt.log.noteLabel')}
        </span>
        <textarea
          value={note}
          maxLength={300}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('attempt.log.notePlaceholder')}
          rows={2}
          className="rounded border border-neutral-800 bg-neutral-950/60 px-2 py-1 text-sm text-neutral-100 focus:border-accent focus:outline-none"
        />
      </label>

      {mutation.error ? (
        <div className="rounded border border-red-900/50 bg-red-950/30 p-2 text-xs">
          <p className="text-red-400">{t('attempt.log.errorTitle')}</p>
          <p className="mt-0.5 text-neutral-400">
            {toUserMessage(mutation.error)}
          </p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="self-start rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
      >
        {mutation.isPending
          ? t('attempt.log.submitting')
          : t('attempt.log.submit')}
      </button>
    </form>
  );
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}
