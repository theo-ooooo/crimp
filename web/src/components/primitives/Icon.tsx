/**
 * Crimp 아이콘 딕셔너리 (2px 얇은 아웃라인).
 * `docs/design/claude/primitives.jsx` 의 CrimpIcon 맵을 그대로 포팅.
 *
 * 사용 예: `<CrimpIcon.home s={24} fill />`
 *
 * 구조:
 * - 각 아이콘은 `IconSpec` 으로 정의 (svg 속성 + glyph ReactNode)
 * - 런타임에서 `createIcon(spec)` 으로 FC 생성 → 일괄 export
 */

import type { FC, ReactNode, SVGProps } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'fill'> {
  /** 아이콘 한 변 크기 (px). 각 아이콘별 디폴트가 다름 */
  s?: number;
  /** true 면 채움(선 대신 면 칠). `fillable: true` 인 아이콘에서만 의미 있음 */
  fill?: boolean;
  className?: string;
}

interface IconSpec {
  /** viewBox 의 한 변 (정사각 기준) */
  vb: number;
  /** 디폴트 크기 */
  d: number;
  /** stroke width */
  sw?: string;
  /** strokeLinecap (round|...) */
  slc?: 'round';
  /** strokeLinejoin (round|...) */
  slj?: 'round';
  /** fill 강제값 ('none' | 'currentColor'). 지정 시 `fillable` 무시 */
  f?: 'none' | 'currentColor';
  /** fill 토글 가능 여부 (home/map/feed/profile). true 면 prop fill 로 currentColor↔none 전환 */
  fillable?: boolean;
  /** 실제 path/circle/rect 자식 */
  children: ReactNode;
}

const SPECS: Record<string, IconSpec> = {
  bell: {
    vb: 24, d: 24, sw: '1.8', slc: 'round', slj: 'round', f: 'none',
    children: (<>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </>),
  },
  search: {
    vb: 24, d: 24, sw: '1.8', slc: 'round', f: 'none',
    children: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  },
  plus: {
    vb: 24, d: 24, sw: '2.2', slc: 'round', f: 'none',
    children: <path d="M12 5v14M5 12h14" />,
  },
  chevR: {
    vb: 20, d: 20, sw: '1.8', slc: 'round', f: 'none',
    children: <path d="m8 5 5 5-5 5" />,
  },
  chevL: {
    vb: 20, d: 20, sw: '1.8', slc: 'round', f: 'none',
    children: <path d="m12 5-5 5 5 5" />,
  },
  close: {
    vb: 24, d: 24, sw: '1.8', slc: 'round', f: 'none',
    children: <path d="M6 6l12 12M18 6L6 18" />,
  },
  home: {
    vb: 24, d: 24, sw: '1.8', slj: 'round', fillable: true,
    children: <path d="M4 10 12 3l8 7v10a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" />,
  },
  map: {
    vb: 24, d: 24, sw: '1.8', slj: 'round', fillable: true,
    children: (<>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path d="M9 4v14M15 6v14" strokeWidth="1.5" />
    </>),
  },
  feed: {
    vb: 24, d: 24, sw: '1.8', slj: 'round', fillable: true,
    children: (<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v5" /></>),
  },
  profile: {
    vb: 24, d: 24, sw: '1.8', slj: 'round', fillable: true,
    children: (<>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </>),
  },
  clock: {
    vb: 20, d: 20, sw: '1.8', slc: 'round', f: 'none',
    children: (<><circle cx="10" cy="10" r="7.5" /><path d="M10 6v4l3 2" /></>),
  },
  pin: {
    vb: 20, d: 20, sw: '1.8', f: 'none',
    children: (<>
      <path d="M10 18s6-5.5 6-10a6 6 0 0 0-12 0c0 4.5 6 10 6 10z" />
      <circle cx="10" cy="8" r="2" />
    </>),
  },
  play: {
    vb: 20, d: 20, f: 'currentColor',
    children: <path d="M5 3.5v13a1 1 0 0 0 1.5.87L17 10.87a1 1 0 0 0 0-1.74L6.5 2.63A1 1 0 0 0 5 3.5Z" />,
  },
  flame: {
    vb: 20, d: 20, sw: '1.8', slj: 'round', f: 'none',
    children: <path d="M10 18c3.3 0 6-2.5 6-5.5 0-2.5-1.5-4-3-5 0 2-2 3-3 3s-1-2 0-4c-3 2-6 4-6 7.5 0 3 2.7 4 6 4z" />,
  },
  check: {
    vb: 20, d: 20, sw: '2.2', slc: 'round', slj: 'round', f: 'none',
    children: <path d="m4 10 4 4 8-9" />,
  },
  filter: {
    vb: 20, d: 20, sw: '1.8', slc: 'round', f: 'none',
    children: <path d="M3 5h14M5 10h10M8 15h4" />,
  },
  trend: {
    vb: 16, d: 16, sw: '1.8', slc: 'round', slj: 'round', f: 'none',
    children: (<><path d="m2 10 4-4 3 3 5-5" /><path d="M10 4h4v4" /></>),
  },
  dots: {
    vb: 20, d: 20, f: 'currentColor',
    children: (<>
      <circle cx="4" cy="10" r="1.8" />
      <circle cx="10" cy="10" r="1.8" />
      <circle cx="16" cy="10" r="1.8" />
    </>),
  },
  target: {
    vb: 20, d: 20, sw: '1.8', f: 'none',
    children: (<>
      <circle cx="10" cy="10" r="7.5" />
      <circle cx="10" cy="10" r="3.5" />
      <circle cx="10" cy="10" r="0.5" fill="currentColor" />
    </>),
  },
};

function createIcon(spec: IconSpec): FC<IconProps> {
  const Cmp: FC<IconProps> = ({ s, fill, className, ...rest }) => {
    const size = s ?? spec.d;
    const resolvedFill = spec.fillable
      ? fill ? 'currentColor' : 'none'
      : spec.f ?? 'none';
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${spec.vb} ${spec.vb}`}
        fill={resolvedFill}
        stroke="currentColor"
        strokeWidth={spec.sw}
        strokeLinecap={spec.slc}
        strokeLinejoin={spec.slj}
        className={className}
        {...rest}
      >
        {spec.children}
      </svg>
    );
  };
  return Cmp;
}

export const CrimpIcon = {
  bell: createIcon(SPECS.bell!),
  search: createIcon(SPECS.search!),
  plus: createIcon(SPECS.plus!),
  chevR: createIcon(SPECS.chevR!),
  chevL: createIcon(SPECS.chevL!),
  close: createIcon(SPECS.close!),
  home: createIcon(SPECS.home!),
  map: createIcon(SPECS.map!),
  feed: createIcon(SPECS.feed!),
  profile: createIcon(SPECS.profile!),
  clock: createIcon(SPECS.clock!),
  pin: createIcon(SPECS.pin!),
  play: createIcon(SPECS.play!),
  flame: createIcon(SPECS.flame!),
  check: createIcon(SPECS.check!),
  filter: createIcon(SPECS.filter!),
  trend: createIcon(SPECS.trend!),
  dots: createIcon(SPECS.dots!),
  target: createIcon(SPECS.target!),
} as const;

export type CrimpIconName = keyof typeof CrimpIcon;
