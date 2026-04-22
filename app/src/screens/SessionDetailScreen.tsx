import { useRoute, type RouteProp } from '@react-navigation/native';
import React, { useMemo } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';

import { SecondaryButton, Skeleton } from '@/components/primitives';
import { useAttemptsQuery } from '@/hooks/useAttempts';
import { useEndSession, useSessionQuery } from '@/hooks/useSessions';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontWeight,
  radius,
  space,
  type Theme,
} from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';
import type { RootStackParamList } from '@/navigation/types';
import type { Attempt } from '@/lib/schemas/attempt';
import { useTokenStore } from '@/store/tokenStore';

import { AttemptRow } from './session/AttemptRow';
import { LogAttemptForm } from './session/LogAttemptForm';
import { SessionMetaCard } from './session/SessionMetaCard';

/**
 * 세션 상세 화면.
 *
 * - 상단 SessionMetaCard (라이브 경과 시간)
 * - 시도 타임라인 (FlatList)
 * - 진행 중이면 하단에 LogAttemptForm + SecondaryButton 세션 종료
 */
export default function SessionDetailScreen(): JSX.Element {
  const theme = useTokens();
  const route = useRoute<RouteProp<RootStackParamList, 'SessionDetail'>>();
  const { extId } = route.params;
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);

  const sessionQuery = useSessionQuery(accessToken, extId);
  const attemptsQuery = useAttemptsQuery(accessToken, extId);
  const endSession = useEndSession(accessToken);

  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!hydrated) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={styles.muted}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!accessToken) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={styles.heading}>
          {t('session.detail.loginRequiredTitle')}
        </Text>
        <Text style={styles.muted}>
          {t('session.detail.loginRequiredDescription')}
        </Text>
      </View>
    );
  }

  const session = sessionQuery.data;
  const attempts: Attempt[] = attemptsQuery.data?.data ?? [];
  const isOngoing = session ? !session.endedAt : false;

  const renderAttempt: ListRenderItem<Attempt> = ({ item }) => (
    <AttemptRow attempt={item} />
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {sessionQuery.isLoading ? (
        <Skeleton height={180} radius={radius.xl} />
      ) : sessionQuery.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>
            {t('session.detail.errorTitle')}
          </Text>
          <Text style={styles.errorBody}>
            {toUserMessage(sessionQuery.error)}
          </Text>
        </View>
      ) : session ? (
        <SessionMetaCard session={session} />
      ) : null}

      <View style={styles.timelineHeader}>
        <Text style={styles.sectionTitle}>
          {t('session.detail.attemptsTitle')}
        </Text>
        <Text style={styles.sectionCount}>{attempts.length}</Text>
      </View>

      {attemptsQuery.isLoading ? (
        <View style={styles.timelineList}>
          <Skeleton height={64} radius={radius.lg} />
          <Skeleton height={64} radius={radius.lg} />
          <Skeleton height={64} radius={radius.lg} />
        </View>
      ) : attemptsQuery.error ? (
        <Text style={styles.errorTitle}>
          {toUserMessage(attemptsQuery.error)}
        </Text>
      ) : attempts.length > 0 ? (
        <FlatList
          data={attempts}
          keyExtractor={(a) => a.extId}
          renderItem={renderAttempt}
          contentContainerStyle={styles.timelineList}
          scrollEnabled={false}
        />
      ) : (
        <Text style={styles.muted}>{t('session.detail.attemptsEmpty')}</Text>
      )}

      {isOngoing && session ? (
        <>
          <LogAttemptForm accessToken={accessToken} sessionExtId={extId} />
          <View style={styles.endWrap}>
            <SecondaryButton
              onPress={() => {
                endSession.endSession(session.extId).catch(() => {
                  /* endSession.error 로 노출 */
                });
              }}
              disabled={endSession.isPending}
            >
              {endSession.isPending
                ? t('session.detail.ending')
                : t('session.detail.endButton')}
            </SecondaryButton>
            {endSession.error ? (
              <Text style={styles.errorTitle}>
                {toUserMessage(endSession.error)}
              </Text>
            ) : null}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: {
      padding: space[5],
      paddingBottom: space[10],
      gap: space[5],
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space[6],
      gap: space[2],
    },
    heading: {
      fontFamily,
      fontSize: 18,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    muted: {
      fontFamily,
      fontSize: 14,
      color: theme.text3,
      textAlign: 'center',
    },
    sectionTitle: {
      fontFamily,
      fontSize: 18,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: -0.36,
    },
    sectionCount: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    timelineHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    timelineList: {
      gap: space[2],
    },
    errorBox: {
      backgroundColor: `${theme.semantic.danger}14`,
      borderRadius: radius.lg,
      padding: space[4],
      gap: space[1],
    },
    errorTitle: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
    },
    errorBody: {
      fontFamily,
      fontSize: 13,
      color: theme.text2,
    },
    endWrap: {
      gap: space[2],
      alignItems: 'stretch',
    },
  });
}
