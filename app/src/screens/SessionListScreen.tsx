import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
  type PressableStateCallbackType,
  type ViewStyle,
} from 'react-native';

import {
  BigStat,
  CrimpIcon,
  PrimaryButton,
  ResultMark,
  Skeleton,
} from '@/components/primitives';
import { useSessionsQuery } from '@/hooks/useSessions';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontWeight,
  letterSpacing,
  radius,
  shadow,
  space,
  touchTarget,
  type Theme,
} from '@/lib/tokens';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTokens } from '@/lib/useTokens';
import type { RootStackNavigationProp } from '@/navigation/types';
import type { Session } from '@/lib/schemas/session';
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
    data,
    error,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSessionsQuery(accessToken);

  const styles = useMemo(() => makeStyles(theme), [theme]);

  const onRefresh = useCallback(() => {
    refetch().catch(() => {
      /* 재시도 실패는 error 로 노출됨 */
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

  const sessions: Session[] = data?.pages.flatMap((p) => p.data) ?? [];
  const weeklyCount = countThisWeek(sessions);

  const renderItem: ListRenderItem<Session> = ({ item }) => (
    <SessionCard
      session={item}
      theme={theme}
      onPress={() =>
        navigation.navigate('SessionDetail', { extId: item.extId })
      }
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('session.list.title')}</Text>
        <IconAction
          onPress={() => navigation.navigate('StartSession')}
          theme={theme}
          accessibilityLabel={t('session.list.newButton')}
        />
      </View>

      {isLoading ? (
        <View style={styles.content}>
          <Skeleton height={96} radius={radius.xl} />
          <View style={{ height: space[3] }} />
          <Skeleton height={84} radius={radius.lg} />
          <View style={{ height: space[2] }} />
          <Skeleton height={84} radius={radius.lg} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t('session.list.errorTitle')}</Text>
          <Text style={styles.errorBody}>{toUserMessage(error)}</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.extId}
          contentContainerStyle={
            sessions.length === 0
              ? [styles.flexContent, styles.content]
              : styles.content
          }
          ListHeaderComponent={
            sessions.length > 0 ? (
              <View style={styles.summaryCard}>
                <BigStat
                  value={weeklyCount}
                  unit={t('session.list.weeklyCountUnit')}
                  label={t('session.list.weeklyCountLabel')}
                  scale="md"
                  accent={theme.accent.base}
                />
              </View>
            ) : null
          }
          ItemSeparatorComponent={ItemSeparator}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={theme.accent.base}
            />
          }
          ListEmptyComponent={
            <EmptyState
              theme={theme}
              onStart={() => navigation.navigate('StartSession')}
            />
          }
          renderItem={renderItem}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator color={theme.accent.base} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

function SessionCard({
  session,
  theme,
  onPress,
}: {
  session: Session;
  theme: Theme;
  onPress: () => void;
}): JSX.Element {
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeCardStyles(theme), [theme]);
  const ended = Boolean(session.endedAt);

  const renderContent = ({ pressed }: PressableStateCallbackType) => {
    const pressedStyle: ViewStyle | null =
      pressed && !reducedMotion ? styles.pressed : null;
    return (
      <View style={[styles.card, pressedStyle]}>
        <View style={styles.left}>
          <Text style={styles.durationLabel}>
            {ended
              ? t('session.list.itemDurationLabelEnded')
              : t('session.list.itemDurationLabelOngoing')}
          </Text>
          <Text style={styles.durationValue}>
            {formatDurationShort(session.durationMin, ended)}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.gymName} numberOfLines={1}>
            {session.gymNameRaw ?? t('session.list.itemGymFallback')}
          </Text>
          <Text style={styles.startTime} numberOfLines={1}>
            {formatDateTime(session.startedAt)}
          </Text>
          <View style={styles.badgeRow}>
            {ended ? (
              <ResultMark kind="SEND" size={20} />
            ) : (
              <View style={styles.liveDot} />
            )}
            <Text
              style={[
                styles.badgeLabel,
                {
                  color: ended ? theme.text3 : theme.accent.ink,
                },
              ]}
            >
              {ended
                ? t('session.detail.endedBadge')
                : t('session.detail.ongoingBadge')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={session.gymNameRaw ?? t('session.list.itemGymFallback')}
    >
      {renderContent}
    </Pressable>
  );
}

function IconAction({
  onPress,
  theme,
  accessibilityLabel,
}: {
  onPress: () => void;
  theme: Theme;
  accessibilityLabel: string;
}): JSX.Element {
  const reducedMotion = useReducedMotion();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: touchTarget.min,
          height: touchTarget.min,
          borderRadius: radius.full,
          backgroundColor: theme.chip,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pressed && !reducedMotion ? { opacity: 0.85 } : null,
      ]}
    >
      <CrimpIcon.plus size={22} color={theme.text} />
    </Pressable>
  );
}

function EmptyState({
  theme,
  onStart,
}: {
  theme: Theme;
  onStart: () => void;
}): JSX.Element {
  const styles = useMemo(() => makeEmptyStyles(theme), [theme]);
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <CrimpIcon.feed size={40} color={theme.text3} />
      </View>
      <Text style={styles.title}>{t('session.list.emptyTitle')}</Text>
      <Text style={styles.body}>{t('session.list.empty')}</Text>
      <View style={styles.cta}>
        <PrimaryButton onPress={onStart}>
          {t('session.list.emptyCta')}
        </PrimaryButton>
      </View>
    </View>
  );
}

function ItemSeparator(): JSX.Element {
  return <View style={itemSeparatorStyles.gap} />;
}

const itemSeparatorStyles = StyleSheet.create({
  gap: { height: space[2] },
});

function countThisWeek(sessions: Session[]): number {
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = (day + 6) % 7;
  start.setDate(start.getDate() - diffToMonday);
  start.setHours(0, 0, 0, 0);
  const startMs = start.getTime();
  return sessions.filter((s) => {
    const t0 = new Date(s.startedAt).getTime();
    return Number.isFinite(t0) && t0 >= startMs;
  }).length;
}

function formatDurationShort(
  duration: number | null,
  ended: boolean,
): string {
  if (duration === null || !ended) {
    return t('session.list.itemDurationPending');
  }
  const total = Math.max(0, duration);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0) {
    return `${h}h ${pad(m)}m`;
  }
  return `${m}m`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

const TABULAR_NUMS = Platform.select<Array<'tabular-nums'>>({
  ios: ['tabular-nums'],
  android: [],
  default: [],
}) as Array<'tabular-nums'>;

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingHorizontal: space[5],
      paddingTop: space[5],
      paddingBottom: space[3],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontFamily,
      fontSize: 32,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: letterSpacing.h1,
    },
    content: {
      paddingHorizontal: space[5],
      paddingBottom: space[10],
    },
    flexContent: {
      flexGrow: 1,
    },
    summaryCard: {
      backgroundColor: theme.subtle,
      borderRadius: radius.xl,
      padding: space[5],
      marginBottom: space[4],
      ...shadow.xs,
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
    errorBox: {
      marginHorizontal: space[5],
      backgroundColor: `${theme.semantic.danger}14`,
      borderRadius: radius.lg,
      padding: space[4],
      gap: space[1],
    },
    errorTitle: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
    },
    errorBody: {
      fontFamily,
      fontSize: 13,
      color: theme.text2,
    },
    footer: {
      paddingVertical: space[4],
      alignItems: 'center',
    },
  });
}

function makeCardStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: space[4],
      padding: space[4],
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
      ...shadow.xs,
    },
    pressed: {
      opacity: 0.85,
    },
    left: {
      justifyContent: 'center',
      gap: space[1],
      minWidth: 88,
    },
    durationLabel: {
      fontFamily,
      fontSize: 12,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
      letterSpacing: -0.12,
    },
    durationValue: {
      fontFamily,
      fontSize: 28,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: -0.84,
      fontVariant: TABULAR_NUMS,
      includeFontPadding: false,
    },
    right: {
      flex: 1,
      justifyContent: 'space-between',
      gap: space[1],
    },
    gymName: {
      fontFamily,
      fontSize: 15,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: -0.3,
    },
    startTime: {
      fontFamily,
      fontSize: 12,
      fontWeight: fontWeight.medium,
      color: theme.text3,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      marginTop: space[1],
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.accent.base,
    },
    badgeLabel: {
      fontFamily,
      fontSize: 12,
      fontWeight: fontWeight.bold,
      letterSpacing: -0.12,
    },
  });
}

function makeEmptyStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space[6],
      gap: space[3],
    },
    iconCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: theme.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space[2],
    },
    title: {
      fontFamily,
      fontSize: 22,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: -0.66,
      textAlign: 'center',
    },
    body: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.medium,
      color: theme.text3,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 280,
    },
    cta: {
      width: '100%',
      maxWidth: 360,
      marginTop: space[4],
    },
  });
}
