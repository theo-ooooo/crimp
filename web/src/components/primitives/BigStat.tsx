/**
 * 큰 숫자 통계 (Toss 톤의 헤드라인 지표).
 *
 * scale: sm/md/lg/xl/hero — `primitives.jsx:115-121` 의 매핑을 그대로 사용.
 * `value` 옆 `unit` 은 숫자보다 작게 baseline 정렬.
 */

import type { CSSProperties, FC } from 'react';

export type BigStatScale = 'sm' | 'md' | 'lg' | 'xl' | 'hero';
export type BigStatAlign = 'left' | 'center';

export interface BigStatProps {
  value: string | number;
  label: string;
  unit?: string;
  scale?: BigStatScale;
  align?: BigStatAlign;
  /** 숫자 색 오버라이드 (기본은 `text-text`, CSS 변수) */
  accent?: string;
  className?: string;
}

const SCALES: Record<BigStatScale, { num: number; lbl: number }> = {
  sm: { num: 32, lbl: 13 },
  md: { num: 48, lbl: 13 },
  lg: { num: 72, lbl: 14 },
  xl: { num: 96, lbl: 15 },
  hero: { num: 140, lbl: 16 },
};

export const BigStat: FC<BigStatProps> = ({
  value,
  label,
  unit,
  scale = 'md',
  align = 'left',
  accent,
  className,
}) => {
  const s = SCALES[scale];
  const labelStyle: CSSProperties = {
    fontSize: s.lbl,
  };
  const numStyle: CSSProperties = {
    fontSize: s.num,
    letterSpacing: '-0.05em',
    lineHeight: 0.95,
    fontVariantNumeric: 'tabular-nums',
    color: accent,
    justifyContent: align === 'center' ? 'center' : 'flex-start',
  };
  const unitStyle: CSSProperties = {
    fontSize: s.num * 0.4,
  };
  return (
    <div className={className} style={{ textAlign: align }}>
      <div
        className="font-semibold tracking-[-0.01em] text-text-3 mb-1.5"
        style={labelStyle}
      >
        {label}
      </div>
      <div className="flex items-baseline gap-0.5 font-extrabold text-text" style={numStyle}>
        <span>{value}</span>
        {unit ? (
          <span className="font-bold text-text-3 ml-1" style={unitStyle}>
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );
};
