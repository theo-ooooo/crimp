/**
 * Crimp 기본 버튼 (Primary / Secondary).
 *
 * 스타일 규약:
 * - 높이 56px (h-14), radius 16px (rounded-lg), 기본 width 100%
 * - 탭 피드백: 눌릴 때 scale(0.98), 200ms ease-standard
 * - 비활성화 상태는 subtle-2 배경 + text-3 텍스트
 * - `className` 으로 width·정렬 등 외부 오버라이드 가능
 */

import type { ButtonHTMLAttributes, FC, ReactNode } from 'react';

type NativeButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export interface ButtonProps extends NativeButtonProps {
  children: ReactNode;
}

const BASE_CLASSES = [
  'inline-flex items-center justify-center',
  'w-full h-14 rounded-lg',
  'text-[17px] font-bold tracking-[-0.02em]',
  'transition-transform duration-fast ease-standard',
  'active:scale-[0.98]',
  'select-none',
  'disabled:cursor-not-allowed disabled:active:scale-100',
].join(' ');

const PRIMARY_CLASSES = [
  'bg-accent text-white',
  'disabled:bg-subtle-2 disabled:text-text-3',
].join(' ');

const SECONDARY_CLASSES = [
  'bg-subtle text-text font-semibold',
  'disabled:bg-subtle-2 disabled:text-text-3',
].join(' ');

// -webkit-tap-highlight-color 제거용 (모바일 Safari 기본 하이라이트)
const TAP_HIGHLIGHT_STYLE = { WebkitTapHighlightColor: 'transparent' } as const;

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export const PrimaryButton: FC<ButtonProps> = ({
  children,
  className,
  disabled,
  type = 'button',
  style,
  ...rest
}) => (
  <button
    type={type}
    disabled={disabled}
    aria-disabled={disabled || undefined}
    className={cx(BASE_CLASSES, PRIMARY_CLASSES, className)}
    style={{ ...TAP_HIGHLIGHT_STYLE, ...style }}
    {...rest}
  >
    {children}
  </button>
);

export const SecondaryButton: FC<ButtonProps> = ({
  children,
  className,
  disabled,
  type = 'button',
  style,
  ...rest
}) => (
  <button
    type={type}
    disabled={disabled}
    aria-disabled={disabled || undefined}
    className={cx(BASE_CLASSES, SECONDARY_CLASSES, className)}
    style={{ ...TAP_HIGHLIGHT_STYLE, ...style }}
    {...rest}
  >
    {children}
  </button>
);
