'use client';

/**
 * `/me` 페이지의 "내 암장" 섹션.
 *
 * - 현재 설정된 mainGymId 를 보여준다 (값이 있으면 ID 표시, 없으면 "미설정").
 *   백엔드 `MeResponse` 가 numeric mainGymId 만 반환하므로 암장 이름은 picker 에서
 *   선택한 직후에만 알 수 있다 — 새로고침 후엔 ID 만 표시된다 (현재 한계).
 * - "변경" CTA → `MainGymPickerDialog` 오픈.
 * - 선택 후 confirm 다이얼로그 → "확인" 누르면 PATCH `/me/profile` 호출.
 *
 * 비고 (해제 미지원):
 *   현재 백엔드 `UserService.updateMyProfile` 은 `null` 을 "변경 없음" 으로 해석한다.
 *   따라서 mainGymId 를 실제로 비우는 UI 는 백엔드 변경 후 추가한다.
 */

import { useState, type FC } from 'react';

import { SecondaryButton } from '@/components/primitives';
import { useUpdateProfileMutation } from '@/hooks/useUpdateProfile';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';

import { MainGymPickerDialog } from './MainGymPickerDialog';

export interface MainGymSectionProps {
  accessToken: string;
  /** 현재 저장된 main gym 의 numeric id. null 이면 미설정. */
  currentMainGymId: number | null;
}

interface PendingSelection {
  id: number;
  extId: string;
  name: string;
}

export const MainGymSection: FC<MainGymSectionProps> = ({
  accessToken,
  currentMainGymId,
}) => {
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [pending, setPending] = useState<PendingSelection | null>(null);
  /** 직전에 선택해서 저장 성공한 항목 — picker 응답에서 받은 name 을 일회성으로 표시. */
  const [lastSavedName, setLastSavedName] = useState<string | null>(null);

  const mutation = useUpdateProfileMutation(accessToken);

  const onPickerSelect = (gym: PendingSelection) => {
    setPickerOpen(false);
    setPending(gym);
  };

  const onConfirm = () => {
    if (!pending) return;
    mutation.mutate(
      { mainGymId: pending.id },
      {
        onSuccess: () => {
          setLastSavedName(pending.name);
          setPending(null);
        },
        // onError 는 mutation.error 로 confirm 다이얼로그 안에서 표시 (아래 markup).
      },
    );
  };

  const onCancelConfirm = () => {
    if (mutation.isPending) return;
    setPending(null);
    mutation.reset();
  };

  // 표시 라벨: 직후 저장된 이름 → "ID: N" → "미설정".
  const valueLabel = (() => {
    if (lastSavedName) return lastSavedName;
    if (currentMainGymId !== null) {
      return t('me.mainGym.fallbackId').replace(
        '{{id}}',
        String(currentMainGymId),
      );
    }
    return t('me.mainGym.unset');
  })();

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
        </div>
      </div>

      <div className="mt-4">
        <SecondaryButton
          onClick={() => setPickerOpen(true)}
          className="h-11 text-sm"
        >
          {currentMainGymId === null
            ? t('me.mainGym.setCta')
            : t('me.mainGym.editCta')}
        </SecondaryButton>
      </div>

      <MainGymPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onPickerSelect}
      />

      {pending ? (
        <ConfirmDialog
          gymName={pending.name}
          isSubmitting={mutation.isPending}
          errorMessage={
            mutation.error ? toUserMessage(mutation.error) : null
          }
          onConfirm={onConfirm}
          onCancel={onCancelConfirm}
        />
      ) : null}
    </section>
  );
};

interface ConfirmDialogProps {
  gymName: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: FC<ConfirmDialogProps> = ({
  gymName,
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
          {t('me.mainGym.confirmTitle')}
        </h3>
        <p className="mt-2 text-body text-text-2">
          {t('me.mainGym.confirmBody').replace('{{name}}', gymName)}
        </p>
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
            {isSubmitting
              ? t('common.loading')
              : t('me.mainGym.confirmCta')}
          </button>
        </div>
      </div>
    </div>
  );
};
