'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  CrimpIcon,
  PrimaryButton,
  Skeleton,
} from '@/components/primitives';
import { useStartSession } from '@/hooks/useSessions';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import { useAccessToken, useTokenStore } from '@/store/tokenStore';

/**
 * `/sessions/new` — 새 세션 시작 폼.
 *
 * Toss 톤 리디자인:
 * - h1 타이틀 + 부드러운 서브카피
 * - 플랫 채움형 입력(`bg-subtle-2`) — 테두리 없이 포커스 시 accent outline
 * - 하단 PrimaryButton 풀너비
 * - 에러는 `role="alert"` 영역에 한국어 문구
 *
 * 기존 로직(useStartSession, datetime-local ↔ ISO 변환, hydration 가드)은 유지.
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
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-3 bg-bg px-6">
        <Skeleton h={32} w="40%" />
        <Skeleton h={16} w="60%" />
      </main>
    );
  }

  if (!accessToken) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 bg-bg px-6">
        <h1 className="text-h1 font-extrabold text-text">
          {t('me.loginRequiredTitle')}
        </h1>
        <p className="text-body text-text-2">
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
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-8 bg-bg px-6 py-10">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1 font-extrabold text-text">
            {t('session.start.title')}
          </h1>
          <p className="text-body font-medium text-text-3">
            {t('session.start.subtitle')}
          </p>
        </div>
        <Link
          href="/sessions"
          aria-label={t('common.cancel')}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-2 transition-colors duration-fast ease-standard hover:bg-subtle"
        >
          <CrimpIcon.close s={22} />
        </Link>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <FieldLabel label={t('session.start.gymNameLabel')}>
          <input
            type="text"
            value={gymName}
            onChange={(e) => setGymName(e.target.value)}
            placeholder={t('session.start.gymNamePlaceholder')}
            maxLength={100}
            className="h-12 w-full rounded-lg border-0 bg-subtle-2 px-4 text-body font-medium text-text placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </FieldLabel>

        <FieldLabel label={t('session.start.startedAtLabel')}>
          <input
            type="datetime-local"
            value={startedAtLocal}
            required
            onChange={(e) => setStartedAtLocal(e.target.value)}
            className="h-12 w-full rounded-lg border-0 bg-subtle-2 px-4 text-body font-medium text-text tabular-nums focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </FieldLabel>

        {mutation.error ? (
          <div
            role="alert"
            className="rounded-2xl bg-subtle p-4 shadow-xs"
          >
            <p className="text-title font-bold text-danger">
              {t('session.start.errorTitle')}
            </p>
            <p className="mt-1 text-body text-text-2">
              {toUserMessage(mutation.error)}
            </p>
          </div>
        ) : null}

        <div className="mt-2">
          <PrimaryButton type="submit" disabled={mutation.isPending}>
            <span className="inline-flex items-center gap-2">
              {mutation.isPending ? null : <CrimpIcon.play s={18} />}
              {mutation.isPending
                ? t('session.start.submitting')
                : t('session.start.submit')}
            </span>
          </PrimaryButton>
        </div>
      </form>
    </main>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-caption font-semibold text-text-3">{label}</span>
      {children}
    </label>
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
