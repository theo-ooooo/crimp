import React from 'react';
import Svg, { Polygon, Text as SvgText } from 'react-native-svg';

import { fontFamily } from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';

/**
 * Crimp 부울더 마크 — `docs/design/claude/v2/Crimp Logo.html` 의
 * `#boulder-mark` polygon (viewBox 380x220) 을 RN 으로 옮긴 형태.
 *
 * `variant="mark"` (기본): 부울더 도형 단독 — 색상은 `color` prop 또는 theme.text.
 * `variant="wordmark"`: 부울더 + "crimp" 텍스트 (LoginScreen hero 용).
 *   - 부울더 : 텍스트 = ink 색
 *   - 또는 lime 색 (배경/대비 따라 호출부에서 color prop 으로 결정).
 */
export interface CrimpLogoProps {
  /** 너비 (px). height 는 220:380 비율로 자동 계산. */
  width?: number;
  /** 마크/wordmark 색. 미지정 시 theme.text. */
  color?: string;
  /** wordmark 일 때 텍스트가 칠해지는 색 (마크 위에 얹힘). 미지정 시 theme.bg. */
  textColor?: string;
  variant?: 'mark' | 'wordmark';
  testID?: string;
}

const BOULDER_POINTS =
  '50,180 30,120 70,40 160,20 250,30 320,80 350,150 320,200 200,210 110,200';

export function CrimpLogo({
  width = 120,
  color,
  textColor,
  variant = 'mark',
  testID,
}: CrimpLogoProps): JSX.Element {
  const theme = useTokens();
  const fillColor = color ?? theme.text;
  const wordColor = textColor ?? theme.bg;
  const height = (width * 220) / 380;

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 380 220"
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel="Crimp"
    >
      <Polygon points={BOULDER_POINTS} fill={fillColor} />
      {variant === 'wordmark' ? (
        <SvgText
          x={190}
          y={130}
          textAnchor="middle"
          fontFamily={fontFamily}
          fontWeight="900"
          fontSize={58}
          letterSpacing={-3.48}
          fill={wordColor}
        >
          crimp
        </SvgText>
      ) : null}
    </Svg>
  );
}
