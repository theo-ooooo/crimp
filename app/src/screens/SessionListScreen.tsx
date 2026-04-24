import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useSessionsQuery } from '@/hooks/useSessions';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import type { RootStackNavigationProp } from '@/navigation/types';
import type { Session } from '@/lib/schemas/session';
import { useTokenStore } from '@/store/tokenStore';

/**
 * 세션 목록 화면.
 *
 * - FlatList + pull-to-refresh + onEndReached 페이지네이션
 * - 비로그인 상태는 안내 메시지만 표시
 */
export default function SessionListScreen(): JSX.Element {
  const navigation = useNavigation<RootStackNavigationProp<'SessionList'>>();
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);
  const {
    data,
    error,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSessionsQuery(accessToken);

  const onRefresh = useCallback(() => {
    refetch().catch(() => {
      /* 재시도 실패 무시 — 에러 상태는 화면에 드러남 */
    });
  }, [refetch]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage().catch(() => {
        /* 페이지 실패 무시 */
      });
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!accessToken) {
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>
          {t('session.detail.loginRequiredTitle')}
        </Text>
        <Text style={styles.muted}>
          {t('session.detail.loginRequiredDescription')}
        </Text>
      </View>
    );
  }

  const sessions: Session[] = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('session.list.title')}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('StartSession')}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryButtonPressed : null,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>
            {t('session.list.newButton')}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#ff7a1f" />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t('session.list.errorTitle')}</Text>
          <Text style={styles.muted}>{toUserMessage(error)}</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.extId}
          contentContainerStyle={sessions.length === 0 ? styles.flex : undefined}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor="#ff7a1f"
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.muted}>{t('session.list.empty')}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate('SessionDetail', { extId: item.extId })
              }
              style={({ pressed }) => [
                styles.item,
                pressed ? styles.itemPressed : null,
              ]}
            >
              <View style={styles.itemRow}>
                <Text style={styles.itemTitle}>
                  {item.gymNameRaw ?? t('session.list.itemGymFallback')}
                </Text>
                <Text
                  style={item.endedAt ? styles.itemMeta : styles.itemBadge}
                >
                  {item.endedAt
                    ? formatDurationMinutes(item.durationMin)
                    : t('session.list.itemOngoing')}
                </Text>
              </View>
              <Text style={styles.itemSubtitle}>
                {formatDateTime(item.startedAt)}
              </Text>
            </Pressable>
          )}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator color="#ff7a1f" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

function formatDurationMinutes(duration: number | null): string {
  if (duration === null) return t('common.empty');
  const minutes = Math.max(0, duration);
  return t('session.list.itemDurationMinutes').replace(
    '{{minutes}}',
    String(minutes),
  );
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0b',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  flex: { flexGrow: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    color: '#f5f5f4',
    fontSize: 20,
    fontWeight: '600',
  },
  heading: {
    color: '#f5f5f4',
    fontSize: 18,
    fontWeight: '600',
  },
  muted: {
    color: '#a3a3a3',
    fontSize: 13,
    textAlign: 'center',
  },
  primaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ff7a1f',
  },
  primaryButtonPressed: {
    backgroundColor: '#1f1208',
  },
  primaryButtonLabel: {
    color: '#ff7a1f',
    fontSize: 12,
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7f1d1d',
    backgroundColor: '#1a0a0a',
    gap: 4,
  },
  errorTitle: { color: '#f87171', fontSize: 13 },
  item: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#111111',
    marginBottom: 8,
  },
  itemPressed: {
    backgroundColor: '#1a1a1a',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: { color: '#f5f5f4', fontSize: 14, fontWeight: '500' },
  itemSubtitle: {
    color: '#737373',
    fontSize: 11,
    marginTop: 4,
    fontFamily: 'Menlo',
  },
  itemMeta: { color: '#737373', fontSize: 11 },
  itemBadge: { color: '#ff7a1f', fontSize: 11 },
  footer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
});
