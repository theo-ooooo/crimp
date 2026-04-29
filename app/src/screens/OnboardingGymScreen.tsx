import React, { useMemo } from 'react';

import { OnboardingGymBody } from '@/components/onboarding-gym/OnboardingGymBody';
import { makeOnboardingGymStyles } from '@/components/onboarding-gym/onboardingGymStyles';
import { useOnboardingGymScreen } from '@/hooks/screens/useOnboardingGymScreen';
import { useTokens } from '@/lib/useTokens';
import { useTokenStore } from '@/store/tokenStore';

/**
 * MainGym 온보딩 게이트 화면.
 *
 * 기획 (`docs/기획/maingym-onboarding.md`) §5.2 / 설계 (`docs/설계/sequence/maingym-onboarding.md`) §3.2.
 *
 * - `App.tsx` 의 RootNavigator 가 `me.mainGym === null && !dismissedThisSession` 일 때 이 화면을 단독 노출.
 * - "이 암장으로 설정": `useUpdateProfile().mutate({ mainGymExtId })` → me 캐시가 갱신되면 RootNavigator 가 자동으로 MainTabs 로 전환.
 * - "나중에 정할게요": `useOnboardingStore.dismiss()` → 같은 분기 조건으로 즉시 MainTabs 전환. 앱 재실행 시 다시 노출.
 * - hardware back: 종료 confirm Alert. 게이트 자체는 풀스크린이고 헤더 없음 (App.tsx 에서 `headerShown=false, gestureEnabled=false`).
 */

export default function OnboardingGymScreen(): JSX.Element {
  const theme = useTokens();
  const accessToken = useTokenStore((s) => s.accessToken);
  const styles = useMemo(() => makeOnboardingGymStyles(theme), [theme]);
  const onboarding = useOnboardingGymScreen(accessToken);

  return (
    <OnboardingGymBody
      styles={styles}
      text3Color={theme.text3}
      text4Color={theme.text4}
      accentInkColor={theme.accent.ink}
      searchText={onboarding.searchText}
      setSearchText={onboarding.setSearchText}
      gyms={onboarding.gyms}
      selectedExtId={onboarding.selected?.extId ?? null}
      onSelectGym={onboarding.setSelected}
      isLoading={onboarding.isLoading}
      error={onboarding.error}
      saving={onboarding.saving}
      canConfirm={onboarding.canConfirm}
      onConfirm={onboarding.onConfirm}
      onSkip={onboarding.onSkip}
      onEndReached={onboarding.onEndReached}
    />
  );
}

