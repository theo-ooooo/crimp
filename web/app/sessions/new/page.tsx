'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import {
  CrimpIcon,
  PrimaryButton,
  Skeleton,
} from '@/components/primitives';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useStartSession } from '@/hooks/useSessions';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';

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
 *
 * 쿼리 파라미터 `gymExtId` + `gymName` 이 오면 "선택된 암장" 카드로 잠그고,
 * `POST /sessions` body 에 `gymExtId` 를 포함해 서버가 내부 id 로 해석하도록 한다.
 * "해제" 누르면 쿼리 파라미터를 제거하고 free-form 입력으로 전환.
 *
 * Next.js App Router 는 `useSearchParams()` 사용 시 반드시 Suspense 경계가 필요하다
 * (CSR bailout 방지). 그래서 기본 export 는 Suspense wrapper, 실제 본체는 Inner.
 */
export default function NewSessionPage(): JSX.Element {
  return (
    <Suspense fallback={<NewSessionSkeleton />}>
      <NewSessionPageInner />
    </Suspense>
  );
}

function NewSessionSkeleton(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-3 bg-bg px-6">
      <Skeleton h={32} w="40%" />
      <Skeleton h={16} w="60%" />
    </main>
  );
}

function NewSessionPageInner(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = useRequireAuth();
  const mutation = useStartSession(accessToken);

  const selectedGymExtId = searchParams?.get('gymExtId') ?? null;
  const selectedGymName = searchParams?.get('gymName') ?? null;
  const hasSelectedGym = Boolean(selectedGymExtId);

  const [gymName, setGymName] = useState('');
  const [startedAtLocal, setStartedAtLocal] = useState<string>(
    toLocalInputValue(new Date()),
  );

  // 선택된 암장이 바뀌면 free-form 입력을 gymName 으로 초기화.
  // (해제 직후에는 기존 값 유지 — 사용자가 즉시 재입력할 수도 있으니 지우지 않음.)
  useEffect(() => {
    if (selectedGymName) {
      setGymName(selectedGymName);
    }
  }, [selectedGymName]);

  const clearSelectedGym = () => {
    // 선택된 암장 해제 시 자유입력 필드도 비워 "방금 선택한 이름" 이 남지 않도록 한다.
    // (기존 useEffect 는 selectedGymName 이 truthy 일 때만 동기화 — null 로 바뀌어도 자동 clear 안 됨.)
    setGymName('');
    router.replace('/sessions/new');
  };

  // hydration 전 OR 토큰 없음(redirect 대기) → 동일 skeleton.
  if (!accessToken) {
    return <NewSessionSkeleton />;
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const iso = localInputToIso(startedAtLocal);
    mutation.mutate(
      {
        gymExtId: selectedGymExtId ?? null,
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
          aria-label={t('common.close')}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-2 transition-colors duration-fast ease-standard hover:bg-subtle"
        >
          <CrimpIcon.close s={22} />
        </Link>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {hasSelectedGym && selectedGymName ? (
          <div
            role="status"
            aria-label={t('session.start.selectedGymLabel')}
            className="flex items-center justify-between gap-3 rounded-2xl bg-subtle p-4 shadow-xs"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-caption font-semibold text-text-3">
                {t('session.start.selectedGymLabel')}
              </span>
              <span className="truncate text-body font-bold text-text">
                {selectedGymName}
              </span>
            </div>
            <button
              type="button"
              onClick={clearSelectedGym}
              aria-label={t('session.start.clearGymCta')}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-bg px-3 text-caption font-semibold text-text-2 transition-colors duration-fast ease-standard hover:text-text"
            >
              <CrimpIcon.close s={14} />
              {t('session.start.clearGymCta')}
            </button>
          </div>
        ) : (
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
        )}

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
