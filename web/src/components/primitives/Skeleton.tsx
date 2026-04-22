/**
 * 쉬머 스켈레톤 — 리스트·상세 로딩 플레이스홀더.
 * 키프레임 `crimp-shimmer` 는 `globals.css` 에 정의.
 * `prefers-reduced-motion: reduce` 시 자동으로 정지 (globals.css 전역 규칙).
 */

import type { CSSProperties, FC } from 'react';

export interface SkeletonProps {
  /** 너비 (px 숫자 또는 '100%' 같은 CSS 문자열) */
  w?: number | string;
  /** 높이 (px) */
  h?: number;
  /** 코너 radius (px, 디폴트 8) */
  r?: number;
  className?: string;
}

/**
 * 그라디언트는 CSS 변수 경유로 넘겨 라이트·다크 모드 자동 반응.
 * `background` 단축 속성 안에 `var()` 를 쓰면 브라우저가 매 렌더링 시 값을 해석.
 */
const GRADIENT =
  'linear-gradient(90deg, var(--color-subtle) 0%, var(--color-subtle-2) 50%, var(--color-subtle) 100%)';

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
