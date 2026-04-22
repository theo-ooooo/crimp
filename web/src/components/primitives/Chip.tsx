/**
 * Crimp 필터·태그 칩 (pill).
 *
 * 스타일 규약:
 * - 높이 36px (h-9), radius full, 좌우 14px (px-3.5)
 * - 활성화: bg-text / text-bg (대비 최대)
 * - 비활성화: bg-chip / text-text-2
 * - `icon` 슬롯으로 아이콘 prepend 가능
 */

import type { ButtonHTMLAttributes, FC, ReactNode } from 'react';

export interface ChipProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  /** 선택 상태 */
  active?: boolean;
  /** 아이콘 슬롯 (텍스트 앞) */
  icon?: ReactNode;
}

// 시각 크기(36px)와 터치 타겟(44px) 을 분리: pseudo before 로 클릭 가능 영역을 4px×2 만큼
// 확장해 접근성 44×44 요구사항을 만족. 마우스 hover 영역은 그대로 36.
const BASE_CLASSES = [
  'relative inline-flex items-center gap-1.5',
  'h-9 px-3.5 rounded-full',
  'text-sm font-semibold tracking-[-0.01em]',
  'transition-[background-color,color,transform] duration-fast ease-standard',
  'select-none',
  "before:content-[''] before:absolute before:inset-x-0 before:-top-1 before:-bottom-1",
  'active:scale-[0.96]',
  'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
].join(' ');

const ACTIVE_CLASSES = 'bg-text text-bg';
const INACTIVE_CLASSES = 'bg-chip text-text-2';

const TAP_HIGHLIGHT_STYLE = { WebkitTapHighlightColor: 'transparent' } as const;

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export const Chip: FC<ChipProps> = ({
  children,
  active = false,
  icon,
  className,
  type = 'button',
  style,
  ...rest
}) => (
  <button
    type={type}
    aria-pressed={active}
    className={cx(BASE_CLASSES, active ? ACTIVE_CLASSES : INACTIVE_CLASSES, className)}
    style={{ ...TAP_HIGHLIGHT_STYLE, ...style }}
    {...rest}
  >
    {icon}
    {children}
  </button>
);
