/**
 * V-스케일 그레이드 뱃지.
 * 배경은 `gradeTint(v)` 의 oklch 연속 그라디언트 (쉬움→어려움).
 * Tailwind 가 동적 oklch 를 다루지 못하므로 인라인 스타일로 주입.
 */

import type { CSSProperties, FC } from 'react';

import { gradeTint } from '@/lib/tokens';

export type GradeBadgeSize = 'sm' | 'md' | 'lg';

export interface GradeBadgeProps {
  /** V-스케일 값 (예: 'V0', 'V4', 'V10'). 범위 밖이면 V0 tint 사용 */
  v: string;
  size?: GradeBadgeSize;
  className?: string;
}

const SIZES: Record<GradeBadgeSize, { w: number; h: number; fs: number }> = {
  sm: { w: 36, h: 22, fs: 12 },
  md: { w: 44, h: 26, fs: 14 },
  lg: { w: 56, h: 34, fs: 18 },
};

export const GradeBadge: FC<GradeBadgeProps> = ({ v, size = 'md', className }) => {
  const sz = SIZES[size];
  const tint = gradeTint(v);
  const style: CSSProperties = {
    width: sz.w,
    height: sz.h,
    borderRadius: sz.h / 2,
    background: tint.bg,
    color: tint.fg,
    fontSize: sz.fs,
    fontVariantNumeric: 'tabular-nums',
  };
  return (
    <span
      className={
        'inline-flex items-center justify-center font-extrabold tracking-[-0.02em] ' +
        (className ?? '')
      }
      style={style}
    >
      {v}
    </span>
  );
};
