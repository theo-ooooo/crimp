'use client';

/**
 * 내 암장 선택 다이얼로그.
 *
 * - `useGymsQuery` 무한 스크롤로 암장을 검색·표시.
 * - 사용자는 항목을 탭해 선택. 선택 시 부모로 `{ extId, name }` 콜백.
 * - PR #59 contract — 서버는 `mainGymExtId` (ULID) 만 받으면 되므로
 *   클라이언트는 numeric id 를 다루지 않는다.
 *
 * 접근성·모션 패턴은 `CommentDialog` 와 동일.
 */

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FC,
  type FormEvent,
} from 'react';

import { CrimpIcon, Skeleton } from '@/components/primitives';
import { useGymsQuery } from '@/hooks/useGyms';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import type { GymItem } from '@/lib/schemas/gym';

export interface MainGymPickerDialogProps {
  open: boolean;
  onClose: () => void;
  /** 사용자가 항목을 탭했을 때 호출. ULID `extId` 와 표시용 `name` 을 전달. */
  onSelect: (gym: { extId: string; name: string }) => void;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => {
      setReduced(e.matches);
    };
    mq.addEventListener('change', onChange);
    return () => {
      mq.removeEventListener('change', onChange);
    };
  }, []);
  return reduced;
}

export const MainGymPickerDialog: FC<MainGymPickerDialogProps> = ({
  open,
  onClose,
  onSelect,
}) => {
  const titleId = useId();
  const reducedMotion = useReducedMotion();
  const sheetRef = useRef<HTMLDivElement | null>(null);

  // Esc 닫기 + Tab focus trap (CommentDialog 패턴 차용).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = sheetRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || !root.contains(active)) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // 마운트 시 검색 입력에 포커스.
  useEffect(() => {
    if (!open) return;
    const root = sheetRef.current;
    if (!root) return;
    const input = root.querySelector<HTMLInputElement>('input[type="search"]');
    input?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
      className="fixed inset-0 z-[70] flex flex-col justify-end"
      style={{
        background: 'rgba(15,20,25,0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto flex max-h-[85%] w-full max-w-2xl flex-col rounded-t-2xl bg-bg text-text"
        style={
          reducedMotion
            ? undefined
            : { animation: 'crimp-sheet-in .3s cubic-bezier(.2,.8,.2,1)' }
        }
      >
        {/* 핸들 바 */}
        <div
          aria-hidden="true"
          className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-sm bg-text-4"
        />

        {/* 헤더 */}
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-3">
          <h2
            id={titleId}
            className="text-h2 font-extrabold tracking-[-0.03em] text-text"
          >
            {t('me.mainGym.pickerTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="border-0 bg-transparent text-body font-semibold text-text-3"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            aria-label={t('common.close')}
          >
            {t('common.close')}
          </button>
        </div>

        <PickerBody onSelect={onSelect} />
      </div>
    </div>
  );
};

const PickerBody: FC<{
  onSelect: MainGymPickerDialogProps['onSelect'];
}> = ({ onSelect }) => {
  const [inputQ, setInputQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  // 300ms debounce — `/gyms` 페이지와 동일.
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
    refetch,
  } = useGymsQuery({ q: debouncedQ, brand: null });

  const items: GymItem[] = data?.pages.flatMap((p) => p.items) ?? [];

  const onSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    // 폼 기본 제출 차단 — 입력 변경마다 debounce 로 자동 반영.
    e.preventDefault();
    setDebouncedQ(inputQ);
  };

  return (
    <>
      {/* 검색 입력 */}
      <form
        onSubmit={onSearchSubmit}
        className="shrink-0 px-5 pb-3"
        role="search"
      >
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
            placeholder={t('me.mainGym.pickerSearchPlaceholder')}
            aria-label={t('me.mainGym.pickerSearchPlaceholder')}
            className="h-12 w-full rounded-lg bg-subtle pl-11 pr-11 text-body font-medium tracking-[-0.01em] text-text placeholder:text-text-3 transition-[outline] duration-fast ease-standard focus:outline focus:outline-2 focus:outline-offset-0 focus:outline-accent"
          />
          {inputQ ? (
            <button
              type="button"
              aria-label={t('common.close')}
              onClick={() => setInputQ('')}
              className="absolute right-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-text-3 transition-colors duration-fast ease-standard hover:bg-subtle-2 hover:text-text-2"
            >
              <CrimpIcon.close s={18} />
            </button>
          ) : null}
        </div>
      </form>

      {/* 목록 — 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),16px)]">
        {isLoading ? (
          <ListSkeleton />
        ) : error ? (
          <ErrorBlock
            message={toUserMessage(error)}
            onRetry={() => {
              void refetch();
            }}
          />
        ) : items.length === 0 ? (
          <EmptyBlock />
        ) : (
          <ul className="flex flex-col gap-2 py-1">
            {items.map((g) => (
              <li key={g.extId}>
                <PickerRow gym={g} onSelect={onSelect} />
              </li>
            ))}
            {hasNextPage ? (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    void fetchNextPage();
                  }}
                  disabled={isFetchingNextPage}
                  className="mx-auto mt-2 inline-flex h-9 items-center rounded-full bg-chip px-4 text-sm font-semibold text-text-2 transition-transform duration-fast ease-standard active:scale-[0.96] disabled:opacity-50"
                >
                  {isFetchingNextPage
                    ? t('common.loading')
                    : t('gym.list.loadMore')}
                </button>
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </>
  );
};

function PickerRow({
  gym,
  onSelect,
}: {
  gym: GymItem;
  onSelect: MainGymPickerDialogProps['onSelect'];
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => {
        onSelect({ extId: gym.extId, name: gym.name });
      }}
      className="flex w-full items-start justify-between gap-3 rounded-2xl bg-subtle p-4 text-left shadow-xs transition-transform duration-fast ease-standard active:scale-[0.99]"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
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

function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): JSX.Element {
  return (
    <div role="alert" className="my-4 flex flex-col gap-2 rounded-2xl bg-subtle p-4">
      <p className="text-title font-bold text-danger">
        {t('gym.list.errorTitle')}
      </p>
      <p className="text-caption text-text-2">{message}</p>
      <div>
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex h-8 items-center rounded-full bg-chip px-3 text-caption font-semibold text-text-2 transition-transform duration-fast ease-standard active:scale-[0.96]"
        >
          {t('common.retry')}
        </button>
      </div>
    </div>
  );
}

function EmptyBlock(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-subtle text-text-3">
        <CrimpIcon.search s={24} />
      </div>
      <p className="text-body font-semibold text-text-2">
        {t('gym.list.empty')}
      </p>
    </div>
  );
}
