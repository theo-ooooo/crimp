import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthHydrationGate } from '@/components/common/screen/AuthHydrationGate';
import { GymDetailBody } from '@/components/gym-detail/GymDetailBody';
import { useTokens } from '@/lib/useTokens';
import type { RootStackNavigationProp, RootStackParamList } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

import { makeGymDetailStyles } from '@/components/gym/gymDetailStyles';
import { useGymDetailScreen } from '@/hooks/screens/useGymDetailScreen';

/**
 * 암장 상세 화면.
 *
 * - 헤더: 이름 + 브랜드 Chip + 주소
 * - 메타 카드: phone / openingHoursJson / settingCycleDays / featuresJson
 * - 활성 루트 섹션 (token 있으면 useGymRoutesQuery)
 * - 하단 PrimaryButton "이 암장에서 세션 시작"
 */
export default function GymDetailScreen(): JSX.Element {
  const theme = useTokens();
  const route = useRoute<RouteProp<RootStackParamList, 'GymDetail'>>();
  const navigation = useNavigation<RootStackNavigationProp<'GymDetail'>>();
  const { extId } = route.params;

  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);
  const detail = useGymDetailScreen(extId, accessToken);
  const handleStartSession = useCallback(
    (gym: NonNullable<typeof detail.gym>) => {
      navigation.push('StartSession', { gymExtId: gym.extId, gymName: gym.name });
    },
    [navigation],
  );

  const styles = useMemo(() => makeGymDetailStyles(theme), [theme]);

  return (
    <AuthHydrationGate
      hydrated={hydrated}
      accessToken={accessToken}
      loginTitleKey="profile.loginRequiredTitle"
      loginDescriptionKey="profile.loginRequiredDescription"
      renderWhenGuest={() => (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
          <GymDetailBody
            theme={theme}
            styles={styles}
            gym={detail.gym}
            gymLoading={detail.gymQuery.isLoading}
            gymError={detail.gymQuery.error ?? null}
            accessToken={null}
            routes={detail.routes}
            routesLoading={detail.routesQuery.isLoading}
            routesError={detail.routesQuery.error ?? null}
            recentActivity={detail.recentActivityQuery.data ?? null}
            recentActivityLoading={detail.recentActivityQuery.isLoading}
            recentActivityError={detail.recentActivityQuery.error ?? null}
            activeSessions={detail.activeSessionsQuery.data ?? null}
            activeSessionsLoading={detail.activeSessionsQuery.isLoading}
            activeSessionsError={detail.activeSessionsQuery.error ?? null}
            hasMoreRoutes={detail.routesQuery.hasNextPage ?? false}
            isFetchingMoreRoutes={detail.routesQuery.isFetchingNextPage}
            onLoadMoreRoutes={detail.onLoadMoreRoutes}
            onBack={() => navigation.goBack()}
            onStartSession={handleStartSession}
          />
        </SafeAreaView>
      )}
    >
      {(token) => (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
          <GymDetailBody
            theme={theme}
            styles={styles}
            gym={detail.gym}
            gymLoading={detail.gymQuery.isLoading}
            gymError={detail.gymQuery.error ?? null}
            accessToken={token}
            routes={detail.routes}
            routesLoading={detail.routesQuery.isLoading}
            routesError={detail.routesQuery.error ?? null}
            recentActivity={detail.recentActivityQuery.data ?? null}
            recentActivityLoading={detail.recentActivityQuery.isLoading}
            recentActivityError={detail.recentActivityQuery.error ?? null}
            activeSessions={detail.activeSessionsQuery.data ?? null}
            activeSessionsLoading={detail.activeSessionsQuery.isLoading}
            activeSessionsError={detail.activeSessionsQuery.error ?? null}
            hasMoreRoutes={detail.routesQuery.hasNextPage ?? false}
            isFetchingMoreRoutes={detail.routesQuery.isFetchingNextPage}
            onLoadMoreRoutes={detail.onLoadMoreRoutes}
            onBack={() => navigation.goBack()}
            onStartSession={handleStartSession}
          />
        </SafeAreaView>
      )}
    </AuthHydrationGate>
  );
}
