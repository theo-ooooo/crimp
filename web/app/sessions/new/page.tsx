'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useStartSession } from '@/hooks/useSessions';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import { useAccessToken, useTokenStore } from '@/store/tokenStore';

/**
 * 세션 시작 화면.
 *
 * - `startedAt` 은 datetime-local 입력 → ISO 문자열 변환.
 * - 성공 시 목록 페이지로 복귀, 세션 상세로 이동은 후속 작업.
 */
export default function NewSessionPage(): JSX.Element {
  const router = useRouter();
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useAccessToken();
  const mutation = useStartSession(accessToken);

  const [gymName, setGymName] = useState('');
  const [startedAtLocal, setStartedAtLocal] = useState<string>(
    toLocalInputValue(new Date()),
  );

  if (!hydrated) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 px-6">
        <p className="text-sm text-neutral-400">{t('common.loading')}</p>
      </main>
    );
  }

  if (!accessToken) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
        <h1 className="text-2xl font-semibold">{t('me.loginRequiredTitle')}</h1>
        <p className="text-sm text-neutral-400">
          {t('me.loginRequiredDescription')}
        </p>
      </main>
    );
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const iso = localInputToIso(startedAtLocal);
    mutation.mutate(
      {
        gymNameRaw: gymName.trim() ? gymName.trim() : null,
        startedAt: iso,
      },
      {
        onSuccess: (created) => {
          router.push(`/sessions/${encodeURIComponent(created.extId)}`);
        },
      },
    );
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold">{t('session.start.title')}</h1>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-400">
            {t('session.start.gymNameLabel')}
          </span>
          <input
            type="text"
            value={gymName}
            onChange={(e) => setGymName(e.target.value)}
            placeholder={t('session.start.gymNamePlaceholder')}
            maxLength={100}
            className="rounded border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100 focus:border-crimp-500 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-400">
            {t('session.start.startedAtLabel')}
          </span>
          <input
            type="datetime-local"
            value={startedAtLocal}
            required
            onChange={(e) => setStartedAtLocal(e.target.value)}
            className="rounded border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100 focus:border-crimp-500 focus:outline-none"
          />
        </label>

        {mutation.error ? (
          <div className="rounded border border-red-900/50 bg-red-950/30 p-3 text-sm">
            <p className="text-red-400">{t('session.start.errorTitle')}</p>
            <p className="mt-1 text-neutral-400">
              {toUserMessage(mutation.error)}
            </p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded bg-crimp-500 px-4 py-2 text-sm font-medium text-white hover:bg-crimp-500/90 disabled:opacity-50"
        >
          {mutation.isPending
            ? t('session.start.submitting')
            : t('session.start.submit')}
        </button>
      </form>
    </main>
  );
}

/**
 * 브라우저 로컬 타임존 기준 `YYYY-MM-DDTHH:mm` 포맷.
 * datetime-local input 기본값 생성에 사용.
 */
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/**
 * datetime-local 값 → ISO 8601 (UTC Z) 변환.
 * 브라우저 로컬 타임존으로 해석 후 `Date` 생성.
 */
function localInputToIso(local: string): string {
  // `new Date('YYYY-MM-DDTHH:mm')` 는 브라우저 로컬 타임존으로 해석된다.
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString();
  }
  return d.toISOString();
}
