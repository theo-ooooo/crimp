import React, { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AuthHydrationGate } from '@/components/common/screen/AuthHydrationGate';
import { useTokens } from '@/lib/useTokens';
import type { RootStackParamList } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

import { HomeLoggedInView } from '@/components/home/HomeLoggedInView';
import { HomeLoggedOutView } from '@/components/home/HomeLoggedOutView';
import { makeHomeStyles } from '@/components/home/homeStyles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

/**
 * 홈 대시보드.
 *
 * 디자인 출처: docs/design/claude/v2/screens-ios.jsx:55 (`HomeScreen`)
 *
 * Mock 레이아웃 정렬:
 * - 인사말 블록 (eyebrow text3 14px / headline 26px 800 + accent 강조)
 * - 큰 통계 카드 (subtle bg, radius 20, padding 24/22) — 좌측 큰 숫자, 우측 최고 그레이드
 * - 주 CTA "세션 시작하기" (PrimaryButton)
 * - 최근 세션 섹션 (제목 + "전체" 링크) — 카드 row: 아이콘 / 이름·시간 / 그레이드·count
 * - 피드/프로필 진입 카드 (Phase 1.5 BottomTabs 도입 전 placeholder; PR #55, #61 정합)
 *
 * 비즈니스 로직 무변경:
 * - useMeQuery / useMeStatsQuery / useSessionsQuery 동일 호출
 * - 토큰 hydrate 가드, LoggedOutView 분기 동일
 */
export default function HomeScreen(): JSX.Element {
  const theme = useTokens();
  const navigation = useNavigation<Nav>();
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);
  const styles = useMemo(() => makeHomeStyles(theme), [theme]);

  return (
    <AuthHydrationGate
      hydrated={hydrated}
      accessToken={accessToken}
      loginTitleKey="profile.loginRequiredTitle"
      loginDescriptionKey="profile.loginRequiredDescription"
      renderWhenGuest={() => <HomeLoggedOutView navigation={navigation} styles={styles} />}
    >
      {(token) => (
        <HomeLoggedInView
          accessToken={token}
          navigation={navigation}
          styles={styles}
          theme={theme}
        />
      )}
    </AuthHydrationGate>
  );
}
