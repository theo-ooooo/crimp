'use client';

/**
 * 닉네임 첫 글자 + hue 기반 oklch 배경의 이니셜 아바타.
 *
 * - 백엔드의 `avatarColorHue` (0..359) 를 그대로 받아 `oklch(82% 0.06 <hue>)` 로 렌더.
 * - 닉네임이 비어있으면 '?' 로 폴백.
 * - 사이즈는 디자인 토큰(36/28 등)에 맞게 호출부에서 px 으로 지정.
 *
 * `FeedPostCard` 와 `CommentDialog` 양쪽이 동일 시각 규칙으로 표시할 수 있도록 분리.
 */

import type { CSSProperties, FC } from 'react';

export interface AvatarProps {
  nickname: string | null | undefined;
  /** 0..359 정수. 범위 외값은 정규화. */
  hue: number;
  /** 한 변 px (정사각). 기본 36. */
  size?: number;
}

export const Avatar: FC<AvatarProps> = ({ nickname, hue, size = 36 }) => {
  const initial =
    (nickname?.trim().charAt(0) ?? '').toUpperCase() || '?';
  // 0..359 로 클램프 — 백엔드 계약상 정수 보장이지만 방어.
  const safeHue = ((Math.trunc(hue) % 360) + 360) % 360;
  const style: CSSProperties = {
    background: `oklch(82% 0.06 ${safeHue})`,
    color: 'var(--color-text)',
    width: size,
    height: size,
    fontSize: Math.max(10, Math.round(size * 0.39)),
  };
  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full font-extrabold"
      style={style}
    >
      {initial}
    </div>
  );
};
