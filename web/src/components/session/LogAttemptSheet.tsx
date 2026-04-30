'use client';

/**
 * LogAttemptSheet — v2 시도 기록 바텀시트.
 *
 * 디자인 source-of-truth: `docs/design/claude/v2/screens-ios-3.jsx` 의 `LogAttemptSheet`.
 *
 * 동작 요약:
 *  - Result picker (4그리드 SEND/FLASH/TRY/FAIL) — 스펙 4개. ONSIGHT 는 v2 picker 에는 노출되지 않으나
 *    백엔드 enum 에는 포함된다 (별도 advanced UI 도입 시 노출).
 *  - 그레이드 horizontal scroll (V0 ~ V8) — null 허용 (기본 V5).
 *  - 홀드 색 picker — 시각적 메타데이터로만 활용. 백엔드는 별도 hold-color 컬럼이 없으므로
 *    `tagsJson` 에 `{ "hold": "red" }` 형태로 저장한다 (TODO: 정식 컬럼 도입 시 마이그레이션).
 *  - 카메라 CTA: video / photo 두 개의 점선 박스 — `onCamera` 콜백을 부모에 위임.
 *  - 메모: 300자 이하 textarea.
 *  - Save: `useLogAttempt` 뮤테이션 호출. 성공 시 시트 닫힘.
 *
 * 접근성:
 *  - role="dialog" + aria-modal + aria-labelledby
 *  - Esc 키 닫힘
 *  - backdrop 클릭 닫힘 (단, 시트 내부 클릭은 stopPropagation)
 *  - useReducedMotion 가드 — prefers-reduced-motion 일 때 enter 애니메이션 생략
 *
 * Z-index: 70 (CameraSheet 의 90 보다 낮다 — CameraSheet 는 시트 위에 덮인다).
 */

import { useEffect, useId, useRef, useState, type FC } from 'react';

import {
  CrimpIcon,
  GradeBadge,
  HoldDot,
  PrimaryButton,
  ResultMark,
  type HoldColorKey,
  type ResultKind,
} from '@/components/primitives';
import { useLogAttempt } from '@/hooks/useAttempts';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import type { LogAttemptBody } from '@/lib/schemas/attempt';


/** Result picker 4그리드. ONSIGHT 는 v2 디자인 spec 에 포함되지 않음. */
const RESULT_OPTIONS = ['SEND', 'FLASH', 'TRY', 'FAIL'] as const satisfies ReadonlyArray<ResultKind>;

const GRADE_OPTIONS = [
  'V0',
  'V1',
  'V2',
  'V3',
  'V4',
  'V5',
  'V6',
  'V7',
  'V8',
] as const;

const HOLD_OPTIONS: ReadonlyArray<HoldColorKey> = [
  'red',
  'blue',
  'yellow',
  'green',
  'white',
  'black',
  'pink',
  'orange',
  'purple',
  'gray',
];

export interface LogAttemptSheetProps {
  /** 활성 세션의 extId */
  sessionExtId: string;
  /** 인증 토큰 */
  accessToken: string;
  onClose: () => void;
}

/**
 * 사용자가 prefers-reduced-motion 을 선호하는지 감지.
 * 시트 enter 애니메이션을 제거할 때 사용.
 */
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

export const LogAttemptSheet: FC<LogAttemptSheetProps> = ({
  sessionExtId,
  accessToken,
  onClose,
}) => {
  const titleId = useId();
  const reducedMotion = useReducedMotion();
  const mutation = useLogAttempt(accessToken, sessionExtId);

  const [result, setResult] = useState<ResultKind>('SEND');
  // null = 미선택. 디자인 spec 은 V5 기본값이지만 UX 적으로는 사용자가 명시 선택하는 게 안전.
  const [grade, setGrade] = useState<string | null>('V5');
  const [hold, setHold] = useState<HoldColorKey | null>('red');
  const [note, setNote] = useState<string>('');

  // 시트 컨테이너 ref — focus trap 범위 제한 + 첫 포커스 대상 탐색.
  const sheetRef = useRef<HTMLDivElement | null>(null);

  // Esc 키로 닫기 + Tab focus trap (시트 외부로 포커스 빠지지 않도록 wrap).
  useEffect(() => {
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
      // 활성 요소가 시트 밖에 있으면 강제로 첫 요소로 끌어온다.
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
  }, [onClose]);

  // 마운트 후 첫 포커스를 시트 내부 첫 버튼으로 이동 (Result picker 의 첫 옵션).
  useEffect(() => {
    const root = sheetRef.current;
    if (!root) return;
    const first = root.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled])',
    );
    first?.focus();
  }, []);

  const onSave = () => {
    // V0..V8 → 0..8 정수 매핑. 백엔드 BigDecimal `gradeNumeric` 채움 → MetaCard `pickTopGrade`
    // 가 parseGradeNumeric 폴백 없이 정확히 정렬된다.
    const gradeNumeric = grade ? Number.parseInt(grade.slice(1), 10) : null;
    const body: LogAttemptBody = {
      result,
      attempts: 1,
      gradeValue: grade,
      gradeNumeric:
        gradeNumeric !== null && Number.isFinite(gradeNumeric)
          ? gradeNumeric
          : null,
      // hold 는 별도 백엔드 컬럼이 없어 tagsJson 에 직렬화한다.
      // TODO(F5): 정식 컬럼 도입 시 별도 필드로 분리.
      tagsJson: hold ? JSON.stringify({ hold }) : null,
      note: note.trim() ? note.trim() : null,
    };
    mutation.mutate(body, {
      onSuccess: () => {
        onClose();
      },
    });
  };

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
        className="max-h-[92%] overflow-y-auto rounded-t-2xl bg-bg p-5 pb-12 text-text"
        style={
          reducedMotion
            ? undefined
            : {
                animation:
                  'crimp-sheet-in .3s cubic-bezier(.2,.8,.2,1)',
              }
        }
      >
        {/* 핸들 바 */}
        <div
          aria-hidden="true"
          className="mx-auto mb-4 h-1 w-9 rounded-sm bg-text-4"
        />

        {/* 헤더 */}
        <div className="mb-5 flex items-baseline justify-between">
          <h2
            id={titleId}
            className="text-h2 font-extrabold tracking-[-0.03em] text-text"
          >
            {t('session.log.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="border-0 bg-transparent text-body font-semibold text-text-3"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {t('session.log.cancel')}
          </button>
        </div>

        {/* Result picker */}
        <section className="mb-6">
          <p className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.04em] text-text-3">
            {t('session.log.resultLabel')}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {RESULT_OPTIONS.map((r) => {
              const on = result === r;
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setResult(r)}
                  className={
                    'flex flex-col items-center gap-1.5 rounded-[14px] border-0 px-2 py-3.5 transition-colors duration-fast ease-standard ' +
                    (on
                      ? 'bg-text text-bg'
                      : 'bg-subtle text-text-2')
                  }
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <ResultMark kind={r} size={28} />
                  <span className="text-[12px] font-extrabold tracking-[0.03em]">
                    {t(`attempt.result.${r}` as const)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Grade picker */}
        <section className="mb-6">
          <p className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.04em] text-text-3">
            {t('session.log.gradeLabel')}
          </p>
          <div
            className="flex gap-1.5 overflow-x-auto pb-1"
            // iOS Safari momentum scroll
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {GRADE_OPTIONS.map((v) => {
              const on = grade === v;
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setGrade(v)}
                  className="shrink-0 rounded-[14px] border-0 bg-transparent p-1"
                  style={{
                    outline: on ? '2px solid var(--color-accent)' : 'none',
                    outlineOffset: on ? 2 : 0,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <GradeBadge v={v} size="lg" />
                </button>
              );
            })}
          </div>
        </section>

        {/* Hold color picker */}
        <section className="mb-6">
          <p className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.04em] text-text-3">
            {t('session.log.holdLabel')}
          </p>
          <div className="flex flex-wrap gap-3">
            {HOLD_OPTIONS.map((c) => {
              const on = hold === c;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  aria-label={c}
                  onClick={() => setHold(c)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-0 bg-transparent p-0"
                  style={{
                    outline: on ? '2px solid var(--color-accent)' : 'none',
                    outlineOffset: 2,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <HoldDot color={c} size={26} label={c} />
                </button>
              );
            })}
          </div>
        </section>

        {/* [PR-W1] 카메라 CTA 섹션 제거 — 웹은 native camera 미지원이라 사진/영상 첨부는
            모바일 전용. 백엔드 미디어 업로드 인프라(presign/complete) 는 그대로 두고,
            웹에서는 attempts 의 텍스트 메타만 입력. 향후 웹 파일 업로드 (input[type=file] +
            드래그앤드롭) 도입 시 별도 PR. */}

        {/* Note */}
        <section className="mb-6">
          <label className="block">
            <span className="mb-2.5 block text-[12px] font-bold uppercase tracking-[0.04em] text-text-3">
              {t('session.log.noteLabel')}
            </span>
            <textarea
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('session.log.notePlaceholder')}
              rows={3}
              className="w-full resize-none rounded-2xl border-0 bg-subtle p-4 text-body font-medium text-text placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
          {/* 글자 수 카운터 — maxLength 도달 시 강조. */}
          <p
            aria-live="polite"
            className={
              'mt-1.5 text-right text-caption tabular-nums ' +
              (note.length >= 300 ? 'text-accent-ink font-bold' : 'text-text-3')
            }
          >
            {note.length} / 300
          </p>
        </section>

        {/* 에러 */}
        {mutation.error ? (
          <div role="alert" className="mb-4 rounded-xl bg-subtle p-3">
            <p className="text-title font-bold text-danger">
              {t('attempt.log.errorTitle')}
            </p>
            <p className="mt-0.5 text-caption text-text-2">
              {toUserMessage(mutation.error)}
            </p>
          </div>
        ) : null}

        {/* Save */}
        <PrimaryButton
          type="button"
          onClick={onSave}
          disabled={mutation.isPending}
          aria-label={t('session.log.save')}
        >
          {mutation.isPending
            ? t('attempt.log.submitting')
            : t('session.log.save')}
        </PrimaryButton>
      </div>
    </div>
  );
};
