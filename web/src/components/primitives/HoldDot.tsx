/**
 * 홀드 색상 원형 점.
 * `color` 에 토큰 키(`red`/`blue`/...)를 넘기면 `colors.hold.*` 에서 조회,
 * 임의 hex 값도 허용.
 */

import type { CSSProperties, FC } from 'react';

import { colors } from '@/lib/tokens';

export type HoldColorKey = keyof typeof colors.hold;

export interface HoldDotProps {
  /** 토큰 키 또는 임의의 CSS color (hex/rgb 등) */
  color: HoldColorKey | string;
  /** 지름 px (디폴트 14) */
  size?: number;
  className?: string;
  /** 스크린리더 레이블 (없으면 aria-hidden) */
  label?: string;
}

function isHoldKey(c: string): c is HoldColorKey {
  return Object.prototype.hasOwnProperty.call(colors.hold, c);
}

export const HoldDot: FC<HoldDotProps> = ({ color, size = 14, className, label }) => {
  const resolved = isHoldKey(color) ? colors.hold[color] : color;
  // 흰색 홀드는 배경과 대비가 약하므로 hairline 인셋 링으로 가시성 확보
  const ring = color === 'white' ? `inset 0 0 0 1px ${colors.light.hairline}` : undefined;
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: size / 2,
    background: resolved,
    boxShadow: ring,
  };
  return (
    <span
      className={'inline-block shrink-0 ' + (className ?? '')}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
};
