'use client';

/**
 * `/me` 페이지의 "내 암장" 섹션.
 *
 * - 백엔드가 해석한 `me.mainGym` 객체(`{ extId, name, brand }`)를 직접 표시.
 *   값이 없으면 "미설정". (PR #59 — 더 이상 numeric id 노출 X.)
 * - "변경" CTA → `MainGymPickerDialog` 오픈 → 선택 → 확인 다이얼로그 →
 *   PATCH `/me/profile` `{ mainGymExtId }`.
 * - "해제" CTA (현재 설정된 경우만 노출) → 확인 다이얼로그 →
 *   PATCH `/me/profile` `{ clearMainGym: true }`.
 */

import { useState, type FC } from 'react';

import { SecondaryButton } from '@/components/primitives';
import { useUpdateProfileMutation } from '@/hooks/useUpdateProfile';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import type { MainGymRef } from '@/lib/schemas/me';

import { MainGymPickerDialog } from './MainGymPickerDialog';

export interface MainGymSectionProps {
  accessToken: string;
  /** 서버가 해석한 현재 mainGym. 미설정 또는 비활성 암장이면 null/undefined. */
  currentMainGym: MainGymRef | null | undefined;
}

interface PendingSelection {
  extId: string;
  name: string;
}

export const MainGymSection: FC<MainGymSectionProps> = ({
  accessToken,
  currentMainGym,
}) => {
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [pendingSelect, setPendingSelect] =
    useState<PendingSelection | null>(null);
  const [pendingClear, setPendingClear] = useState<boolean>(false);

  const mutation = useUpdateProfileMutation(accessToken);

  const onPickerSelect = (gym: PendingSelection) => {
    setPickerOpen(false);
    setPendingSelect(gym);
  };

  const onConfirmSelect = () => {
    if (!pendingSelect) return;
    mutation.mutate(
      { mainGymExtId: pendingSelect.extId },
      {
        onSuccess: () => {
          // me 캐시는 mutation onSuccess 가 갱신 — 다이얼로그만 닫으면 된다.
          setPendingSelect(null);
        },
        // onError 는 mutation.error 로 confirm 다이얼로그 안에서 표시.
      },
    );
  };

  const onCancelSelect = () => {
    if (mutation.isPending) return;
    setPendingSelect(null);
    mutation.reset();
  };

  const onConfirmClear = () => {
    mutation.mutate(
      { clearMainGym: true },
      {
        onSuccess: () => {
          setPendingClear(false);
        },
      },
    );
  };

  const onCancelClear = () => {
    if (mutation.isPending) return;
    setPendingClear(false);
    mutation.reset();
  };

  // 표시 라벨: 서버 해석된 mainGym.name → "미설정".
  const valueLabel = currentMainGym?.name ?? t('me.mainGym.unset');
  const hasMainGym = !!currentMainGym;

  return (
    <section
      aria-labelledby="me-main-gym-title"
      className="rounded-2xl bg-subtle p-5 shadow-xs"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            id="me-main-gym-title"
            className="text-caption font-semibold uppercase tracking-wider text-text-3"
          >
            {t('me.mainGym.title')}
          </h2>
          <p className="truncate text-title font-bold text-text">
            {valueLabel}
          </p>
          {currentMainGym?.brand ? (
            <span className="mt-1 inline-flex w-fit items-center rounded-full bg-chip px-3 py-1 text-caption font-semibold text-text-2">
              {currentMainGym.brand}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <SecondaryButton
          onClick={() => setPickerOpen(true)}
          className="h-11 text-sm"
        >
          {hasMainGym ? t('me.mainGym.editCta') : t('me.mainGym.setCta')}
        </SecondaryButton>
        {hasMainGym ? (
          <button
            type="button"
            onClick={() => setPendingClear(true)}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-transparent px-4 text-sm font-semibold text-text-2 transition-colors duration-fast ease-standard hover:bg-subtle-2"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {t('me.mainGym.clearCta')}
          </button>
        ) : null}
      </div>

      <MainGymPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onPickerSelect}
      />

      {pendingSelect ? (
        <ConfirmDialog
          titleKey="me.mainGym.confirmTitle"
          body={t('me.mainGym.confirmBody').replace(
            '{{name}}',
            pendingSelect.name,
          )}
          ctaKey="me.mainGym.confirmCta"
          isSubmitting={mutation.isPending}
          errorMessage={
            mutation.error ? toUserMessage(mutation.error) : null
          }
          onConfirm={onConfirmSelect}
          onCancel={onCancelSelect}
        />
      ) : null}

      {pendingClear ? (
        <ConfirmDialog
          titleKey="me.mainGym.clearConfirmTitle"
          body={t('me.mainGym.clearConfirmBody')}
          ctaKey="me.mainGym.clearConfirmCta"
          isSubmitting={mutation.isPending}
          errorMessage={
            mutation.error ? toUserMessage(mutation.error) : null
          }
          onConfirm={onConfirmClear}
          onCancel={onCancelClear}
        />
      ) : null}
    </section>
  );
};

interface ConfirmDialogProps {
  /** 다이얼로그 제목 i18n 키. */
  titleKey:
    | 'me.mainGym.confirmTitle'
    | 'me.mainGym.clearConfirmTitle';
  /** 사전 보간된 본문 텍스트. */
  body: string;
  /** 확인 버튼 라벨 i18n 키. */
  ctaKey: 'me.mainGym.confirmCta' | 'me.mainGym.clearConfirmCta';
  isSubmitting: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: FC<ConfirmDialogProps> = ({
  titleKey,
  body,
  ctaKey,
  isSubmitting,
  errorMessage,
  onConfirm,
  onCancel,
}) => {
  // 가벼운 모달 — picker 와 달리 단일 메시지 + 두 버튼만 필요하므로
  // 별도 sheet 로 분리하지 않고 인라인 다이얼로그로 처리.
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="me-main-gym-confirm-title"
      onClick={onCancel}
      className="fixed inset-0 z-[80] flex items-center justify-center px-6"
      style={{
        background: 'rgba(15,20,25,0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-bg p-6 shadow-md"
      >
        <h3
          id="me-main-gym-confirm-title"
          className="text-h2 font-extrabold tracking-[-0.03em] text-text"
        >
          {t(titleKey)}
        </h3>
        <p className="mt-2 text-body text-text-2">{body}</p>
        {errorMessage ? (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-subtle p-3 text-caption text-danger"
          >
            {errorMessage}
          </p>
        ) : null}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-subtle text-sm font-semibold text-text transition-transform duration-fast ease-standard active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {t('me.mainGym.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-ink transition-transform duration-fast ease-standard active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-subtle-2 disabled:text-text-3"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {isSubmitting ? t('common.loading') : t(ctaKey)}
          </button>
        </div>
      </div>
    </div>
  );
};
