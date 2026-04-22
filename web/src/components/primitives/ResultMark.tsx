/**
 * 시도 결과 마크 (SEND / FLASH / ONSIGHT / TRY / FAIL).
 * 색상 + 아이콘 병행 — 색맹 대응 위해 글리프 필수.
 * `primitives.jsx:28-34` 의 글리프를 그대로 포팅.
 */

import type { CSSProperties, FC, ReactElement } from 'react';

import { colors } from '@/lib/tokens';

/**
 * 참고: TRY/FAIL 은 neutral 배경·전경이 필요한데, 이 파일은 JS 객체로 색을
 * 선계산하기 때문에 CSS 변수 문자열(`var(--color-subtle-2)`) 을 그대로 넘긴다.
 * 브라우저는 `style.background = 'var(--color-subtle-2)'` 를 정상 해석하고
 * 라이트/다크 전환 시 자동으로 덮어써짐.
 */

export type ResultKind = 'SEND' | 'FLASH' | 'ONSIGHT' | 'TRY' | 'FAIL';

export interface ResultMarkProps {
  kind: ResultKind;
  /** 한 변 픽셀 (디폴트 22) */
  size?: number;
  className?: string;
}

interface GlyphDef {
  bg: string;
  fg: string;
  glyph: ReactElement;
}

const GLYPHS: Record<ResultKind, GlyphDef> = {
  SEND: {
    bg: colors.accent.base,
    fg: '#FFFFFF',
    glyph: (
      <path
        d="m4 9 3 3 7-8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
  FLASH: {
    bg: colors.semantic.warning,
    fg: '#1A1200',
    glyph: <path d="M11 2 4 11h4l-1 7 7-9h-4l1-7z" fill="currentColor" />,
  },
  ONSIGHT: {
    bg: colors.semantic.success,
    fg: '#FFFFFF',
    glyph: (
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="9" r="5" />
        <circle cx="9" cy="9" r="1.5" fill="currentColor" />
      </g>
    ),
  },
  TRY: {
    bg: 'var(--color-subtle-2)',
    fg: 'var(--color-text-2)',
    glyph: (
      <path
        d="M9 3v7l4 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    ),
  },
  FAIL: {
    bg: 'var(--color-subtle-2)',
    fg: 'var(--color-text-3)',
    glyph: (
      <path d="M5 5l8 8M13 5l-8 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    ),
  },
};

export const ResultMark: FC<ResultMarkProps> = ({ kind, size = 22, className }) => {
  const m = GLYPHS[kind];
  const wrap: CSSProperties = {
    width: size,
    height: size,
    borderRadius: size / 2,
    background: m.bg,
    color: m.fg,
  };
  const inner = size * 0.72;
  return (
    <span
      role="img"
      aria-label={kind}
      className={'inline-flex items-center justify-center shrink-0 ' + (className ?? '')}
      style={wrap}
    >
      <svg width={inner} height={inner} viewBox="0 0 18 18" aria-hidden="true">
        {m.glyph}
      </svg>
    </span>
  );
};
