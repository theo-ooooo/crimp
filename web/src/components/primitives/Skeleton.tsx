/**
 * 쉬머 스켈레톤 — 리스트·상세 로딩 플레이스홀더.
 * 키프레임 `crimp-shimmer` 는 `globals.css` 에 정의.
 * `prefers-reduced-motion: reduce` 시 자동으로 정지 (globals.css 전역 규칙).
 */

import type { CSSProperties, FC } from 'react';

import { colors } from '@/lib/tokens';

export interface SkeletonProps {
  /** 너비 (px 숫자 또는 '100%' 같은 CSS 문자열) */
  w?: number | string;
  /** 높이 (px) */
  h?: number;
  /** 코너 radius (px, 디폴트 8) */
  r?: number;
  className?: string;
}

// 라이트 토큰을 쓰되 CSS 변수 기반 그라디언트로 다크 모드도 자동 반응하도록.
// gradient 에는 토큰 hex 를 깔고, 배경 색상은 CSS 변수 우선.
const GRADIENT = `linear-gradient(90deg, ${colors.light.subtle} 0%, ${colors.light.subtle2} 50%, ${colors.light.subtle} 100%)`;

export const Skeleton: FC<SkeletonProps> = ({ w = '100%', h = 16, r = 8, className }) => {
  const style: CSSProperties = {
    width: typeof w === 'number' ? `${w}px` : w,
    height: h,
    borderRadius: r,
    background: GRADIENT,
    backgroundSize: '200% 100%',
    animation: 'crimp-shimmer 1.4s ease-in-out infinite',
  };
  return <div aria-hidden="true" className={className} style={style} />;
};
