'use client';

/**
 * CameraSheet — v2 카메라/비디오 캡처 시트 (placeholder).
 *
 * 디자인 source-of-truth: `docs/design/claude/v2/screens-ios-3.jsx` 의 `CameraSheet`.
 *
 * 주의: 이번 PR 은 **시각 + 인터랙션 스켈레톤** 만 담당한다.
 *  - 가짜 viewfinder (그라디언트 + 흩뿌려진 holds + 실루엣 + reticle)
 *  - 닫기 버튼 / REC 인디케이터 / 카메라 flip 자리 (no-op)
 *  - record/shutter 버튼 → `onShoot` 콜백만 호출.
 *
 * TODO(F5 follow-up): 실 카메라 캡처는 다음 PR 에서 도입.
 *  1) `navigator.mediaDevices.getUserMedia` 로 실 stream 획득 → `<video autoPlay muted playsInline>` 로 미리보기.
 *  2) `MediaRecorder` API 로 녹화 (webm/h264) — 60초 cap.
 *  3) 사진 모드는 `<video>` 한 프레임을 `<canvas>` 에 그려 toBlob → File 변환.
 *  4) 백엔드 S3 presigned URL 엔드포인트 (별도 backend PR) → 업로드 후 `mediaId` 획득.
 *  5) `mediaId` 를 LogAttemptSheet 폼 상태에 전달 → `useLogAttempt` 본문에 포함.
 *  6) 권한 거부 / 디바이스 미지원 / 녹화 중 백그라운드 등 엣지케이스 처리.
 */

import { useEffect, type FC } from 'react';

import { CrimpIcon, GradeBadge, HoldDot } from '@/components/primitives';
import { t } from '@/lib/i18n';

export type CameraSheetMode = 'video' | 'photo';

export interface CameraSheetProps {
  mode: CameraSheetMode;
  recording: boolean;
  onClose: () => void;
  onShoot: () => void;
}

/** 가짜 viewfinder 에 그릴 holds 좌표/색. 디자인 spec 의 좌표를 그대로 포팅. */
const FAKE_HOLDS: ReadonlyArray<{
  c: string;
  x: string;
  y: string;
  s: number;
  r: number;
}> = [
  { c: '#E03131', x: '22%', y: '20%', s: 28, r: 20 },
  { c: '#1C7ED6', x: '52%', y: '35%', s: 36, r: -15 },
  { c: '#F59F00', x: '38%', y: '55%', s: 24, r: 5 },
  { c: '#E64980', x: '68%', y: '62%', s: 32, r: 30 },
  { c: '#2F9E44', x: '28%', y: '78%', s: 22, r: -10 },
  { c: '#7048E8', x: '78%', y: '28%', s: 26, r: 12 },
];

/** focus reticle 모서리 4개 위치 정의. */
const RETICLE_CORNERS: ReadonlyArray<{
  vert: 'top' | 'bottom';
  horz: 'left' | 'right';
}> = [
  { vert: 'top', horz: 'left' },
  { vert: 'top', horz: 'right' },
  { vert: 'bottom', horz: 'left' },
  { vert: 'bottom', horz: 'right' },
];

export const CameraSheet: FC<CameraSheetProps> = ({
  mode,
  recording,
  onClose,
  onShoot,
}) => {
  // Esc 키로 닫기 — 모바일에서는 동작하지 않지만 데스크톱 키보드 사용자 대응.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={
        mode === 'video'
          ? t('session.log.cameraVideoTitle')
          : t('session.log.cameraPhotoTitle')
      }
      className="fixed inset-0 z-[90] flex flex-col overflow-hidden bg-black"
    >
      {/* Top bar */}
      <div className="absolute left-0 right-0 top-[54px] z-[5] flex items-center justify-between px-4 py-2">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-full border-0 bg-white/20 text-white backdrop-blur-md"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <CrimpIcon.close s={20} />
        </button>

        {recording ? (
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-extrabold tracking-[0.04em] text-white tabular-nums"
            style={{ background: 'rgba(224,49,49,0.92)' }}
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-white"
            />
            REC · 00:12
          </div>
        ) : (
          <div aria-hidden="true" className="h-[38px]" />
        )}

        {/* flip camera placeholder — TODO(F5): 실 device flip 호출. */}
        <button
          type="button"
          aria-label="flip"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-full border-0 bg-white/20 text-white"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M3 8a7 7 0 0 1 12-4l2-2v6h-6l2-2a5 5 0 0 0-8 2" />
            <path d="M17 12a7 7 0 0 1-12 4l-2 2v-6h6l-2 2a5 5 0 0 0 8-2" />
          </svg>
        </button>
      </div>

      {/* Viewfinder — fake climbing scene */}
      <div className="relative flex-1 overflow-hidden">
        {/* gradient backdrop simulating gym wall */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 30% 40%, #5a4a3c 0%, #2a221c 60%, #0d0a08 100%)',
          }}
        />

        {/* simulated climbing holds */}
        {FAKE_HOLDS.map((h, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="absolute"
            style={{
              left: h.x,
              top: h.y,
              width: h.s,
              height: h.s * 0.7,
              background: h.c,
              borderRadius: '50% 50% 35% 35%',
              transform: `rotate(${h.r}deg)`,
              boxShadow:
                'inset -2px -3px 6px rgba(0,0,0,0.4), 0 4px 10px rgba(0,0,0,0.3)',
            }}
          />
        ))}

        {/* climber silhouette */}
        <div
          aria-hidden="true"
          className="absolute"
          style={{
            left: '40%',
            bottom: '20%',
            width: 60,
            height: 140,
            opacity: 0.7,
          }}
        >
          <svg viewBox="0 0 60 140" fill="rgba(0,0,0,0.55)" aria-hidden="true">
            <circle cx="32" cy="18" r="11" />
            <path d="M22 30 L40 30 Q44 30 44 35 L48 70 L42 95 L44 130 L36 130 L34 100 L28 100 L26 130 L18 130 L20 95 L14 70 L18 35 Q18 30 22 30 Z" />
            <path d="M48 38 L58 50 L52 56 L42 44 Z" />
            <path d="M14 38 L4 50 L10 56 L20 44 Z" />
          </svg>
        </div>

        {/* focus reticle */}
        <div
          aria-hidden="true"
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%,-50%)',
            width: 80,
            height: 80,
            border: '1.5px solid rgba(255,255,255,0.7)',
            borderRadius: 4,
          }}
        >
          {RETICLE_CORNERS.map((c, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="absolute"
              style={{
                [c.vert]: -1,
                [c.horz]: -1,
                width: 10,
                height: 10,
                borderTop: c.vert === 'top' ? '2px solid #fff' : 'none',
                borderBottom: c.vert === 'bottom' ? '2px solid #fff' : 'none',
                borderLeft: c.horz === 'left' ? '2px solid #fff' : 'none',
                borderRight: c.horz === 'right' ? '2px solid #fff' : 'none',
              }}
            />
          ))}
        </div>

        {/* timestamp / route label overlay */}
        <div
          aria-hidden="true"
          className="absolute left-4 bottom-4 flex items-center gap-2 rounded-[10px] px-3 py-2 text-[12px] font-semibold text-white backdrop-blur-md"
          style={{ background: 'rgba(0,0,0,0.4)' }}
        >
          <GradeBadge v="V5" size="sm" />
          <HoldDot color="red" size={10} />
          <span className="tabular-nums">서울볼더스 · 19:42</span>
        </div>
      </div>

      {/* Mode switcher (visual only — actual mode controlled by parent) */}
      <div className="relative z-[5] flex justify-center gap-7 pb-2.5 pt-3.5">
        {(
          [
            { k: 'photo', l: t('session.log.cameraPhotoModeLabel') },
            { k: 'video', l: t('session.log.cameraVideoModeLabel') },
            { k: 'beta', l: t('session.log.cameraBetaModeLabel') },
          ] as const
        ).map((m) => {
          const on = m.k === mode;
          return (
            <span
              key={m.k}
              className="relative px-1 py-1.5 text-[13px] font-bold tracking-[-0.01em]"
              style={{
                color: on ? 'var(--color-accent-flash)' : 'rgba(255,255,255,0.6)',
              }}
            >
              {m.l}
              {on ? (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-sm"
                  style={{ background: 'var(--color-accent-flash)' }}
                />
              ) : null}
            </span>
          );
        })}
      </div>

      {/* Bottom bar — gallery / shutter / flip */}
      <div className="relative z-[5] flex items-center justify-between bg-black px-[30px] pb-[50px]">
        {/* gallery thumb (decorative) */}
        <div
          aria-hidden="true"
          className="relative h-[50px] w-[50px] overflow-hidden rounded-[10px] border-2 border-white/20"
          style={{
            background:
              'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-ink) 100%)',
          }}
        >
          <span
            className="absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-[9px] font-extrabold text-white"
            style={{ background: 'rgba(0,0,0,0.6)' }}
          >
            3
          </span>
        </div>

        {/* Shutter / record */}
        <button
          type="button"
          onClick={onShoot}
          aria-label={
            mode === 'video'
              ? t('session.log.cameraVideoTitle')
              : t('session.log.cameraPhotoTitle')
          }
          className="relative flex h-[78px] w-[78px] items-center justify-center rounded-full border-0 bg-transparent p-0"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border-4 border-white"
          />
          <span
            aria-hidden="true"
            style={{
              width: recording ? 32 : 60,
              height: recording ? 32 : 60,
              borderRadius: recording ? 6 : 30,
              background: mode === 'video' ? '#E03131' : '#fff',
              transition: 'all .25s cubic-bezier(.2,.8,.2,1)',
            }}
          />
        </button>

        {/* flip camera (no-op) */}
        <button
          type="button"
          aria-label="flip"
          className="flex h-[50px] w-[50px] items-center justify-center rounded-full border-0 bg-white/20 text-white"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 8h13l-3-3M19 14H6l3 3" />
            <circle cx="11" cy="11" r="3" strokeDasharray="2 2" />
          </svg>
        </button>
      </div>
    </div>
  );
};
