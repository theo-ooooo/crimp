/**
 * Crimp 부울더 마크 — `docs/design/claude/v2/Crimp Logo.html` 의 `#boulder-mark`
 * polygon (viewBox 380x220) 을 웹 SVG 로 옮긴 형태. 앱 측 (`app/src/components/common/
 * primitives/CrimpLogo.tsx`) 과 동일한 path / viewBox / aspect ratio 사용.
 *
 * `variant="mark"` (기본): 부울더 도형 단독 — 색상은 `color` prop 또는 currentColor.
 * `variant="wordmark"`: 부울더 + "crimp" 텍스트 (LoginPage hero 용).
 *  - 부울더 = 외부 색 (color prop)
 *  - 텍스트 = textColor prop — 보통 accent (lime) 으로 강조.
 */

export type CrimpLogoVariant = 'mark' | 'wordmark';

export interface CrimpLogoProps {
  /** 너비 (px). height 는 220:380 비율로 자동 계산. */
  width?: number;
  /** 마크/wordmark 색. 미지정 시 currentColor (CSS text 색 상속). */
  color?: string;
  /** wordmark 일 때 텍스트가 칠해지는 색. 미지정 시 var(--color-bg). */
  textColor?: string;
  variant?: CrimpLogoVariant;
  className?: string;
}

const BOULDER_POINTS =
  '50,180 30,120 70,40 160,20 250,30 320,80 350,150 320,200 200,210 110,200';

// [PR #106] 보울더 폴리곤의 실 bounding box (x: 30~350, y: 20~210). viewBox 를 이
// 박스에 타이트하게 잡아 SVG 좌우/상하 빈 패딩 없이 렌더 — TopNav 등에서 인접 요소와
// 시각적 정렬이 깔끔.
const VIEWBOX_X = 30;
const VIEWBOX_Y = 20;
const VIEWBOX_W = 320;
const VIEWBOX_H = 190;

export function CrimpLogo({
  width = 120,
  color,
  textColor,
  variant = 'mark',
  className,
}: CrimpLogoProps): JSX.Element {
  // [PR #106] 디자인 spec — 라이트: ink 보울더 + lime 워드마크, 다크: 자동 reverse
  // (lime 보울더 + ink 워드마크). globals.css 의 `--color-logo-mark` / `-wordmark` CSS
  // var 가 prefers-color-scheme 에 맞춰 자동 스왑.
  const fillColor = color ?? 'var(--color-logo-mark)';
  const wordColor = textColor ?? 'var(--color-logo-wordmark)';
  const height = (width * VIEWBOX_H) / VIEWBOX_W;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`${VIEWBOX_X} ${VIEWBOX_Y} ${VIEWBOX_W} ${VIEWBOX_H}`}
      role="img"
      aria-label="Crimp"
      className={className}
    >
      <polygon points={BOULDER_POINTS} fill={fillColor} />
      {variant === 'wordmark' ? (
        <text
          x={190}
          y={130}
          textAnchor="middle"
          fontWeight="900"
          fontSize={58}
          letterSpacing={-3.48}
          fill={wordColor}
          style={{ fontFamily: 'inherit' }}
        >
          crimp
        </text>
      ) : null}
    </svg>
  );
}
