import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import React, { useMemo } from 'react';

import { AuthHydrationGate } from '@/components/common/screen/AuthHydrationGate';
import { StartSessionBody } from '@/components/start-session/StartSessionBody';
import { makeStartSessionStyles } from '@/components/start-session/startSessionStyles';
import { useStartSessionScreen } from '@/hooks/screens/useStartSessionScreen';
import { useTokens } from '@/lib/useTokens';
import type { RootStackNavigationProp, RootStackParamList } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

/**
 * 세션 시작 화면.
 *
 * - 최상단 H2 "어디서 붙어요?" 질문
 * - 암장 TextInput (theme.subtle + radius 16 + padding 16)
 * - 하단 고정 PrimaryButton + KeyboardAvoidingView
 * - 에러 블록: danger 톤 카드
 */
export default function StartSessionScreen(): JSX.Element {
  const theme = useTokens();
  const navigation = useNavigation<RootStackNavigationProp<'StartSession'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'StartSession'>>();
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);
  const styles = useMemo(() => makeStartSessionStyles(theme), [theme]);
  const {
    mutation,
    mainGym,
    activeGym,
    selectedGymName,
    hasSelectedGym,
    searchMode,
    searchText,
    setSearchText,
    gyms,
    gymQuery,
    canSubmit,
    clearSelectedGym,
    useOtherGym,
    useMainGym,
    selectGym,
    onEndReached,
    refreshGyms,
    onSubmit,
  } = useStartSessionScreen(accessToken, route, navigation);

  return (
    <AuthHydrationGate
      hydrated={hydrated}
      accessToken={accessToken}
      loginTitleKey="session.detail.loginRequiredTitle"
      loginDescriptionKey="session.detail.loginRequiredDescription"
    >
      {() => (
        <StartSessionBody
          styles={styles}
          mainGym={mainGym}
          activeGym={activeGym}
          selectedGymName={selectedGymName}
          hasSelectedGym={hasSelectedGym}
          searchMode={searchMode}
          searchText={searchText}
          setSearchText={setSearchText}
          gyms={gyms}
          gymSearchLoading={gymQuery.isLoading}
          gymSearchFetchingNext={gymQuery.isFetchingNextPage}
          gymSearchRefreshing={gymQuery.isRefetching}
          gymSearchHasMore={Boolean(gymQuery.hasNextPage)}
          gymSearchError={gymQuery.error ?? null}
          canSubmit={canSubmit}
          clearSelectedGym={clearSelectedGym}
          useOtherGym={useOtherGym}
          useMainGym={useMainGym}
          onSelectGym={selectGym}
          onEndReached={onEndReached}
          refreshGyms={refreshGyms}
          onSubmit={onSubmit}
          isPending={mutation.isPending}
          error={mutation.error ?? null}
          hintText={formatNow()}
          accentColor={theme.accent.base}
          text4Color={theme.text4}
          backgroundColor={theme.bg}
        />
      )}
    </AuthHydrationGate>
  );
}

function formatNow(): string {
  try {
    const d = new Date();
    return d.toLocaleString();
  } catch {
    return '';
  }
}
