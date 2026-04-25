'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  Chip,
  CrimpIcon,
  SecondaryButton,
  Skeleton,
} from '@/components/primitives';
import { useGymsQuery } from '@/hooks/useGyms';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import type { GymItem } from '@/lib/schemas/gym';

/**
 * `/gyms` — 암장 검색·목록.
 *
 * 데이터 소스: `/api/v1/gyms?cursor=&q=&brand=&size=` (공개).
 *
 * 상태 분기:
 * - 로딩: Skeleton 3개
 * - 에러: ErrorCard (`role="alert"`)
 * - 빈 상태: "검색 결과가 없어요"
 * - 데이터: 카드 리스트 + "더 보기"
 *
 * 검색 입력은 300ms debounce 로 쿼리 파라미터화. 브랜드 Chip 은 top 브랜드 하드코딩 —
 * 추후 `/api/v1/gyms/brands` 집계 엔드포인트 도입 시 동적으로 대체 예정.
 */
export default function GymsPage(): JSX.Element {
  const [inputQ, setInputQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [brand, setBrand] = useState<string | null>(null);

  useEffect(() => {
    const h = setTimeout(() => setDebouncedQ(inputQ), 300);
    return () => clearTimeout(h);
  }, [inputQ]);

  const {
    data,
    error,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useGymsQuery({ q: debouncedQ, brand });

  const items: GymItem[] = data?.pages.flatMap((p) => p.items) ?? [];
  const hasFilter = debouncedQ.trim() !== '' || brand !== null;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 bg-bg px-6 py-10">
      <header className="flex flex-col gap-6">
        <h1 className="text-h1 font-extrabold tracking-[-0.04em] text-text">
          {t('gym.list.title')}
        </h1>

        <SearchInput
          value={inputQ}
          placeholder={t('gym.list.searchPlaceholder')}
          onChange={setInputQ}
          onClear={() => setInputQ('')}
        />

        <BrandFilters
          selected={brand}
          onSelect={(b) => setBrand(b === brand ? null : b)}
        />

        {hasFilter ? (
          <button
            type="button"
            onClick={() => {
              setInputQ('');
              setDebouncedQ('');
              setBrand(null);
            }}
            className="self-start text-caption font-semibold text-text-3 transition-colors duration-fast ease-standard hover:text-text-2"
          >
            {t('gym.list.filtersReset')}
          </button>
        ) : null}
      </header>

      {isLoading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorCard
          title={t('gym.list.errorTitle')}
          message={toUserMessage(error)}
        />
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((g) => (
            <li key={g.extId}>
              <GymCard gym={g} />
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
              : t('gym.list.loadMore')}
          </SecondaryButton>
        </div>
      ) : null}
    </main>
  );
}

/**
 * Phase 1 하드코딩 브랜드. 추후 `/api/v1/gyms/brands` (count desc) 로 교체.
 * 이 값은 사용자 화면에 노출되지 않고 쿼리 파라미터로만 전달되므로 i18n 대상 아님.
 */
const TOP_BRANDS = ['클라임파크', '더클라이밍', '라이즈', '클라이밍파크'] as const;

function BrandFilters({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (brand: string) => void;
}): JSX.Element {
  return (
    <div
      className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1"
      role="group"
      aria-label={t('gym.list.filtersBrand')}
    >
      {TOP_BRANDS.map((b) => (
        <Chip
          key={b}
          active={selected === b}
          onClick={() => onSelect(b)}
          className="shrink-0"
        >
          {b}
        </Chip>
      ))}
    </div>
  );
}

function SearchInput({
  value,
  placeholder,
  onChange,
  onClear,
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onClear: () => void;
}): JSX.Element {
  return (
    <div className="relative flex items-center">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-4 text-text-3"
      >
        <CrimpIcon.search s={18} />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-12 w-full rounded-lg bg-subtle pl-11 pr-11 text-body font-medium tracking-[-0.01em] text-text placeholder:text-text-3 transition-[outline] duration-fast ease-standard focus:outline focus:outline-2 focus:outline-offset-0 focus:outline-accent"
      />
      {value ? (
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={onClear}
          className="absolute right-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-text-3 transition-colors duration-fast ease-standard hover:bg-subtle-2 hover:text-text-2"
        >
          <CrimpIcon.close s={18} />
        </button>
      ) : null}
    </div>
  );
}

function ListSkeleton(): JSX.Element {
  return (
    <ul className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      {[0, 1, 2].map((i) => (
        <li key={i} className="rounded-2xl bg-subtle p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <Skeleton h={18} w="55%" />
            <Skeleton h={18} w={72} r={10} />
          </div>
          <div className="mt-3">
            <Skeleton h={14} w="72%" />
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
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-subtle px-6 py-14 text-center shadow-xs">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg text-text-3">
        <CrimpIcon.search s={28} />
      </div>
      <p className="text-body font-semibold text-text-2">
        {t('gym.list.empty')}
      </p>
    </div>
  );
}

function GymCard({ gym }: { gym: GymItem }): JSX.Element {
  return (
    <Link
      href={`/gyms/${encodeURIComponent(gym.extId)}`}
      className="block rounded-2xl bg-subtle p-5 shadow-xs transition-transform duration-fast ease-standard hover:shadow-sm active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-title font-bold text-text">{gym.name}</p>
          <p className="truncate text-caption font-medium text-text-3">
            {gym.address ?? t('gym.list.addressFallback')}
          </p>
        </div>
        {gym.brand ? (
          <span className="inline-flex shrink-0 items-center rounded-full bg-chip px-3 py-1 text-caption font-semibold text-text-2">
            {gym.brand}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
