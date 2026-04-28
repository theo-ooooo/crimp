'use client';

/**
 * `/onboarding/main-gym` — MainGym 온보딩 게이트 페이지 (웹).
 *
 * 기획서: `docs/기획/maingym-onboarding.md` §5.2 / 설계서: `docs/설계/sequence/maingym-onboarding.md` §2.
 *
 * - `useRequireAuth({ skipOnboardingGate: true })` 로 비인증만 차단 (자기 자신을
 *   다시 redirect 하면 무한 루프가 되므로 게이트 자체는 skip).
 * - 이미 mainGym 이 있으면 즉시 `next` (또는 `/`) 로 replace.
 * - 검색(`useGymsQuery` 무한 스크롤) → 선택 → "이 암장으로 설정" → PATCH /me {mainGymExtId}
 *   → 성공 시 `next` 로 replace. 실패는 inline 에러 + 재선택 가능.
 * - "나중에 정할게요" → `onboardingDismiss.set()` → `next` 로 replace.
 *   → 새 탭/세션 새로고침 시 sessionStorage 가 비어 있으면 게이트 재노출.
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';

import { CrimpIcon, PrimaryButton, Skeleton } from '@/components/primitives';
import { useGymsQuery } from '@/hooks/useGyms';
import { useMeQuery } from '@/hooks/useMe';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useUpdateProfileMutation } from '@/hooks/useUpdateProfile';
import { toUserMessage } from '@/lib/api/errorMessage';
import { onboardingDismiss } from '@/lib/auth/onboardingDismiss';
import { t } from '@/lib/i18n';
import type { GymItem } from '@/lib/schemas/gym';

const SEARCH_DEBOUNCE_MS = 300;

function resolveNext(raw: string | null): string {
  // open redirect 방지 — 내부 경로(`/...`)만 허용. 그 외는 홈으로.
  if (!raw) return '/';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

export default function OnboardingMainGymPage(): JSX.Element {
  // Next.js 14: useSearchParams 는 client-side 파일이라도 prerender 단계에서
  // Suspense 경계 안에 있어야 한다 (CSR bailout 회피).
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OnboardingMainGymPageInner />
    </Suspense>
  );
}

function OnboardingMainGymPageInner(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = resolveNext(searchParams.get('next'));

  const accessToken = useRequireAuth({ skipOnboardingGate: true });
  const meQuery = useMeQuery(accessToken);

  // 이미 mainGym 이 설정되어 있으면 (직접 URL 진입 등) 즉시 next 로 빠짐.
  useEffect(() => {
    if (!accessToken) return;
    if (meQuery.data && meQuery.data.mainGym != null) {
      router.replace(next as Route);
    }
  }, [accessToken, meQuery.data, next, router]);

  const [inputQ, setInputQ] = useState<string>('');
  const [debouncedQ, setDebouncedQ] = useState<string>('');
  const [selected, setSelected] = useState<GymItem | null>(null);

  useEffect(() => {
    const h = setTimeout(() => setDebouncedQ(inputQ.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(h);
  }, [inputQ]);

  const filters = useMemo(
    () => ({ q: debouncedQ.length > 0 ? debouncedQ : null, brand: null }),
    [debouncedQ],
  );

  const {
    data,
    error,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGymsQuery(filters);

  const gyms: GymItem[] = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  const mutation = useUpdateProfileMutation(accessToken);
  const saving = mutation.isPending;
  const canConfirm = selected !== null && !saving;

  const onConfirm = () => {
    if (!selected) return;
    mutation.mutate(
      { mainGymExtId: selected.extId },
      {
        onSuccess: () => {
          // me 캐시는 mutation 이 갱신했으므로 RootLayout 가드와 무관하게 곧장 next 로 replace.
          router.replace(next as Route);
        },
      },
    );
  };

  const onSkip = () => {
    onboardingDismiss.set();
    router.replace(next as Route);
  };

  if (!accessToken) {
    // useRequireAuth 가 /login 으로 redirect 하는 동안 placeholder.
    return <PageSkeleton />;
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-6 text-text">
      <header className="mb-4">
        <h1 className="text-h1 font-extrabold tracking-[-0.04em] text-text">
          {t('onboarding.mainGym.title')}
        </h1>
        <p className="mt-2 text-body text-text-2">
          {t('onboarding.mainGym.subtitle')}
        </p>
      </header>

      {/* 검색 입력 */}
      <div className="mb-3">
        <div className="relative flex items-center">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-4 text-text-3"
          >
            <CrimpIcon.search s={18} />
          </span>
          <input
            type="search"
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            placeholder={t('onboarding.mainGym.searchPlaceholder')}
            aria-label={t('onboarding.mainGym.searchPlaceholder')}
            disabled={saving}
            className="h-12 w-full rounded-lg bg-subtle pl-11 pr-11 text-body font-medium tracking-[-0.01em] text-text placeholder:text-text-3 transition-[outline] duration-fast ease-standard focus:outline focus:outline-2 focus:outline-offset-0 focus:outline-accent disabled:opacity-60"
          />
          {inputQ ? (
            <button
              type="button"
              aria-label={t('onboarding.mainGym.clearSearch')}
              onClick={() => setInputQ('')}
              className="absolute right-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-text-3 transition-colors duration-fast ease-standard hover:bg-subtle-2 hover:text-text-2"
            >
              <CrimpIcon.close s={18} />
            </button>
          ) : null}
        </div>
      </div>

      {/* 결과 영역 */}
      <section className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ListSkeleton />
        ) : error ? (
          <div role="alert" className="my-2 rounded-2xl bg-subtle p-4">
            <p className="text-title font-bold text-danger">
              {t('onboarding.mainGym.searchErrorTitle')}
            </p>
            <p className="mt-1 text-caption text-text-2">
              {toUserMessage(error)}
            </p>
          </div>
        ) : gyms.length === 0 ? (
          <EmptyBlock />
        ) : (
          <ul className="flex flex-col gap-2 py-1">
            {gyms.map((g) => (
              <li key={g.extId}>
                <GymRow
                  gym={g}
                  active={selected?.extId === g.extId}
                  disabled={saving}
                  onSelect={setSelected}
                />
              </li>
            ))}
            {hasNextPage ? (
              <li className="mt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    void fetchNextPage();
                  }}
                  disabled={isFetchingNextPage}
                  className="inline-flex h-9 items-center rounded-full bg-chip px-4 text-sm font-semibold text-text-2 transition-transform duration-fast ease-standard active:scale-[0.96] disabled:opacity-50"
                >
                  {isFetchingNextPage
                    ? t('common.loading')
                    : t('onboarding.mainGym.loadMore')}
                </button>
              </li>
            ) : null}
          </ul>
        )}
      </section>

      {/* mutation 에러 (게이트 유지 + 재선택 안내) */}
      {mutation.error ? (
        <div role="alert" className="mt-3 rounded-xl bg-subtle p-3">
          <p className="text-caption font-semibold text-danger">
            {t('onboarding.mainGym.errorTitle')}
          </p>
          <p className="mt-1 text-caption text-text-2">
            {toUserMessage(mutation.error)}
          </p>
        </div>
      ) : null}

      {/* CTA */}
      <div className="mt-4 flex flex-col gap-3">
        <PrimaryButton
          onClick={onConfirm}
          disabled={!canConfirm}
          aria-label={t('onboarding.mainGym.confirmCta')}
        >
          {saving ? t('common.loading') : t('onboarding.mainGym.confirmCta')}
        </PrimaryButton>
        <button
          type="button"
          onClick={onSkip}
          disabled={saving}
          className="self-center px-3 py-2 text-body font-medium text-text-3 transition-colors duration-fast ease-standard hover:text-text-2 disabled:opacity-50"
        >
          {t('onboarding.mainGym.skipCta')}
        </button>
      </div>
    </main>
  );
}

function GymRow({
  gym,
  active,
  disabled,
  onSelect,
}: {
  gym: GymItem;
  active: boolean;
  disabled: boolean;
  onSelect: (gym: GymItem) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onSelect(gym)}
      disabled={disabled}
      aria-pressed={active}
      className={`flex w-full items-start justify-between gap-3 rounded-2xl border p-4 text-left transition-transform duration-fast ease-standard active:scale-[0.99] ${
        active
          ? 'border-accent bg-bg shadow-xs'
          : 'border-transparent bg-subtle shadow-xs'
      } disabled:opacity-60`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-title font-bold text-text">{gym.name}</p>
        <p className="truncate text-caption font-medium text-text-3">
          {gym.brand ?? gym.address ?? t('gym.list.addressFallback')}
        </p>
      </div>
      {active ? (
        <span className="inline-flex shrink-0 items-center rounded-full bg-accent px-3 py-1 text-caption font-semibold text-accent-on">
          <CrimpIcon.check s={14} />
        </span>
      ) : null}
    </button>
  );
}

function ListSkeleton(): JSX.Element {
  return (
    <ul className="flex flex-col gap-2 py-1" aria-busy="true" aria-live="polite">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="rounded-2xl bg-subtle p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <Skeleton h={18} w="55%" />
            <Skeleton h={18} w={64} r={10} />
          </div>
          <div className="mt-3">
            <Skeleton h={14} w="72%" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyBlock(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-subtle text-text-3">
        <CrimpIcon.search s={24} />
      </div>
      <p className="text-body font-semibold text-text-2">
        {t('onboarding.mainGym.emptyTitle')}
      </p>
      <p className="text-caption text-text-3">
        {t('onboarding.mainGym.emptyBody')}
      </p>
    </div>
  );
}

function PageSkeleton(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col gap-3 px-5 pt-6">
      <Skeleton h={28} w="60%" />
      <Skeleton h={16} w="80%" />
      <div className="mt-2">
        <Skeleton h={48} w="100%" r={12} />
      </div>
      <Skeleton h={64} w="100%" r={16} />
      <Skeleton h={64} w="100%" r={16} />
      <Skeleton h={64} w="100%" r={16} />
    </main>
  );
}
