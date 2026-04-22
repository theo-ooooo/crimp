'use client';

import Link from 'next/link';

import { useSessionsQuery } from '@/hooks/useSessions';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import type { Session } from '@/lib/schemas/session';
import { useAccessToken, useTokenStore } from '@/store/tokenStore';

export default function SessionsPage(): JSX.Element {
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useAccessToken();
  const {
    data,
    error,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useSessionsQuery(accessToken);

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
        <h1 className="text-2xl font-semibold">{t('me.loginRequiredTitle')}</h1>
        <p className="text-sm text-neutral-400">
          {t('me.loginRequiredDescription')}
        </p>
      </main>
    );
  }

  const sessions: Session[] = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('session.list.title')}</h1>
        <Link
          href="/sessions/new"
          className="rounded border border-crimp-500 bg-crimp-500/10 px-3 py-1.5 text-sm text-crimp-500 hover:bg-crimp-500/20"
        >
          {t('session.list.newButton')}
        </Link>
      </header>

      {isLoading ? (
        <p className="text-sm text-neutral-400">{t('common.loading')}</p>
      ) : error ? (
        <div className="rounded border border-red-900/50 bg-red-950/30 p-4 text-sm">
          <p className="text-red-400">{t('session.list.errorTitle')}</p>
          <p className="mt-1 text-neutral-400">{toUserMessage(error)}</p>
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-neutral-400">{t('session.list.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => (
            <li key={s.extId}>
              <Link
                href={`/sessions/${encodeURIComponent(s.extId)}`}
                className="block rounded border border-neutral-800 bg-neutral-950/50 p-4 hover:border-neutral-700"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-neutral-100">
                    {s.gymNameRaw ?? t('session.list.itemGymFallback')}
                  </p>
                  <span
                    className={
                      s.endedAt
                        ? 'text-xs text-neutral-500'
                        : 'text-xs text-crimp-500'
                    }
                  >
                    {s.endedAt
                      ? formatDurationMinutes(s.durationMin)
                      : t('session.list.itemOngoing')}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-neutral-500">
                  {formatDateTime(s.startedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hasNextPage ? (
        <button
          type="button"
          onClick={() => {
            void fetchNextPage();
          }}
          disabled={isFetchingNextPage}
          className="mx-auto rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
        >
          {isFetchingNextPage ? t('common.loading') : t('session.list.loadMore')}
        </button>
      ) : null}
    </main>
  );
}

function formatDurationMinutes(duration: number | null): string {
  if (duration === null) return t('common.empty');
  const minutes = Math.max(0, duration);
  return t('session.list.itemDurationMinutes').replace('{{minutes}}', String(minutes));
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
