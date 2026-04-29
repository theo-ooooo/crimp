import React from 'react';

import { DesignPrimitivesBody } from '@/components/design/DesignPrimitivesBody';
import { useDesignPrimitivesScreen } from '@/hooks/screens/useDesignPrimitivesScreen';
import { useTokens } from '@/lib/useTokens';

/**
 * 디자인 프리미티브 미리보기 화면.
 * 라이트/다크 테마는 시스템 Appearance 자동 반영.
 * 네비 메뉴 미등록 — 딥링크/개발 모드 전용.
 */
export default function DesignPrimitivesScreen(): JSX.Element {
  const theme = useTokens();
  const { chipActive, setChipActive } = useDesignPrimitivesScreen();

  return (
    <DesignPrimitivesBody
      theme={theme}
      chipActive={chipActive}
      setChipActive={setChipActive}
    />
  );
}
