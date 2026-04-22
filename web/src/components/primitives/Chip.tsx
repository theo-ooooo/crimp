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

const BASE_CLASSES = [
  'inline-flex items-center gap-1.5',
  'h-9 px-3.5 rounded-full',
  'text-sm font-semibold tracking-[-0.01em]',
  'transition-colors duration-fast ease-standard',
  'select-none',
  'disabled:cursor-not-allowed disabled:opacity-60',
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
