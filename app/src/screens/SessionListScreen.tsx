import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import {
  Text,
  View,
} from 'react-native';

import { AuthHydrationGate } from '@/components/common/screen/AuthHydrationGate';
import {
  SessionListBody,
  SessionListLoading,
} from '@/components/session-list/SessionListBody';
import { SessionListHeaderAction } from '@/components/session-list/SessionListHeaderAction';
import { makeSessionListStyles } from '@/components/session-list/sessionListStyles';
import { useSessionListScreen } from '@/hooks/screens/useSessionListScreen';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import { useTokens } from '@/lib/useTokens';
import type { RootStackNavigationProp } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

/**
 * 내 세션 목록 화면.
 *
 * - 상단 header: h1 타이틀 + "+" 아이콘 버튼 (새 세션)
 * - 상단 요약 BigStat (이번 주 진행 세션 수)
 * - FlatList 카드 아이템: 경과 시간 BigStat(sm) · 암장·시작시각 · ResultMark 뱃지
 * - pull-to-refresh, onEndReached 커서 페이지네이션 유지
 */
export default function SessionListScreen(): JSX.Element {
  const theme = useTokens();
  const navigation = useNavigation<RootStackNavigationProp<'SessionList'>>();
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);
  const {
    sessions,
    error,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    onRefresh,
    onEndReached,
  } = useSessionListScreen(accessToken);

  const styles = useMemo(() => makeSessionListStyles(theme), [theme]);

  return (
    <AuthHydrationGate
      hydrated={hydrated}
      accessToken={accessToken}
      loginTitleKey="session.detail.loginRequiredTitle"
      loginDescriptionKey="session.detail.loginRequiredDescription"
    >
      {() => (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
          <View style={styles.headerActionRow}>
            <SessionListHeaderAction
              onPress={() => navigation.navigate('StartSession')}
              accessibilityLabel={t('session.list.newButton')}
            />
          </View>

          {isLoading ? (
            <SessionListLoading />
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>{t('session.list.errorTitle')}</Text>
              <Text style={styles.errorBody}>{toUserMessage(error)}</Text>
            </View>
          ) : (
            <SessionListBody
              sessions={sessions}
              isRefetching={isRefetching}
              isFetchingNextPage={isFetchingNextPage}
              onRefresh={onRefresh}
              onEndReached={onEndReached}
            />
          )}
        </View>
      )}
    </AuthHydrationGate>
  );
}

