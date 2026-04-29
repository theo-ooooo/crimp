import React, { useMemo } from 'react';

import { AuthHydrationGate } from '@/components/common/screen/AuthHydrationGate';
import { MainGymPickerModal } from '@/components/profile/MainGymPickerModal';
import { ProfileBody } from '@/components/profile/ProfileBody';
import { makeProfileStyles } from '@/components/profile/profileStyles';
import { useProfileScreen } from '@/hooks/screens/useProfileScreen';
import { useTokens } from '@/lib/useTokens';
import { useTokenStore } from '@/store/tokenStore';

/**
 * 프로필 화면.
 *
 * 디자인 출처: docs/design/claude/v2/screens-ios-2.jsx:384 (`ProfileScreen`)
 *
 * Mock 레이아웃 정렬 (v2):
 * - 헤더 row: 아바타(이니셜 그라데이션) + 닉네임 22px 800 + 보조 (bio)
 * - 통계 row: 완등 / 세션 / (친구는 도메인 미도입 — 생략) 3개 인라인
 * - Hero: 최고 그레이드 큰 숫자 (accent 색상, 80px display)
 * - 내 암장 카드 (PR #61 — 기존 동작 그대로 유지)
 *
 * Phase 1 한계로 mock 의 그레이드 분포 / 배지 / 친구 카운트 / 설정 아이콘은 생략.
 *
 * 비즈니스 로직 무변경:
 * - useMeQuery / useUpdateProfile mutation / pull-to-refresh 동일
 * - MainGymPickerModal 호출 / mainGym 변경·해제 흐름 동일
 * - me/stats 표시는 추가 (useMeStatsQuery — HomeScreen 과 동일 캐시 키 재사용).
 */
export default function ProfileScreen(): JSX.Element {
  const theme = useTokens();
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);
  const styles = useMemo(() => makeProfileStyles(theme), [theme]);
  return (
    <AuthHydrationGate
      hydrated={hydrated}
      accessToken={accessToken}
      loginTitleKey="profile.loginRequiredTitle"
      loginDescriptionKey="profile.loginRequiredDescription"
    >
      {(token) => <ProfileLoggedInContainer accessToken={token} styles={styles} theme={theme} />}
    </AuthHydrationGate>
  );
}

function ProfileLoggedInContainer({
  accessToken,
  styles,
  theme,
}: {
  accessToken: string;
  styles: ReturnType<typeof makeProfileStyles>;
  theme: ReturnType<typeof useTokens>;
}): JSX.Element {
  const profile = useProfileScreen(accessToken);

  return (
    <>
      <ProfileBody
        styles={styles}
        theme={theme}
        me={profile.meQuery.data ?? null}
        stats={profile.statsQuery.data ?? null}
        isStatsLoading={profile.statsQuery.isLoading}
        isLoading={profile.meQuery.isLoading}
        error={profile.meQuery.error ?? null}
        isRefetching={profile.meQuery.isRefetching}
        onRefresh={profile.onRefresh}
        hasMainGym={profile.hasMainGym}
        mainGymName={profile.mainGym?.name ?? null}
        mainGymBrand={profile.mainGym?.brand ?? null}
        onOpenPicker={() => profile.setPickerOpen(true)}
        onClearMainGym={profile.onClearMainGym}
        isSaving={profile.updateMutation.isPending}
        updateError={profile.updateMutation.error ?? null}
      />
      {profile.pickerOpen ? (
        <MainGymPickerModal
          visible={profile.pickerOpen}
          currentGymExtId={profile.mainGym?.extId ?? null}
          saving={profile.updateMutation.isPending}
          onClose={() => profile.setPickerOpen(false)}
          onSelect={profile.onPickerSelect}
        />
      ) : null}
    </>
  );
}
