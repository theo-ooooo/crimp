import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  CrimpIcon,
  PrimaryButton,
  Skeleton,
} from '@/components/common/primitives';
import { useMeQuery } from '@/hooks/queries/useMe';
import { useMeStatsQuery } from '@/hooks/queries/useMeStats';
import { useSessionsQuery } from '@/hooks/queries/useSessions';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import { radius, space, type Theme } from '@/lib/tokens';
import type { MainTabsParamList, RootStackParamList } from '@/navigation/types';
import type { Session } from '@/lib/schemas/session';

import { makeHomeStyles } from './homeStyles';
import { RecentSessionCard } from './RecentSessionCard';

type Styles = ReturnType<typeof makeHomeStyles>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;
type TabsNav = BottomTabNavigationProp<MainTabsParamList>;

function fill(key: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replace(`{{${k}}}`, String(v)),
    key,
  );
}

function toMonthDay(iso: string): string {
  return iso.length >= 10 ? iso.slice(5) : iso;
}

type Props = {
  accessToken: string;
  navigation: Nav;
  styles: Styles;
  theme: Theme;
};

export function HomeLoggedInView({
  accessToken,
  navigation,
  styles,
  theme,
}: Props): JSX.Element {
  const meQuery = useMeQuery(accessToken);
  const statsQuery = useMeStatsQuery(accessToken);
  const sessionsQuery = useSessionsQuery(accessToken);

  const nickname = meQuery.data?.nickname ?? t('home.nicknameFallback');
  const stats = statsQuery.data;
  const recent: Session[] =
    sessionsQuery.data?.pages.flatMap((p) => p.items).slice(0, 3) ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.greetingBlock}>
        <Text style={styles.eyebrow}>{t('home.eyebrow')}</Text>
        <Text style={styles.greeting}>
          {fill(t('home.greetingHeadline'), { nickname })}
        </Text>
        {stats ? (
          <Text style={styles.greeting}>
            {t('home.weeklyHeadlinePrefix')}
            <Text style={[styles.greeting, styles.greetingAccent]}>
              {stats.weekSends}
            </Text>
            {t('home.weeklyHeadlineSuffix')}
          </Text>
        ) : null}
      </View>

      {statsQuery.isLoading ? (
        <View style={styles.statsCard}>
          <Skeleton width="40%" height={14} />
          <View style={{ height: space[4] }} />
          <Skeleton width="60%" height={56} />
          <View style={{ height: space[4] }} />
          <Skeleton width="100%" height={20} />
        </View>
      ) : statsQuery.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t('home.errorTitle')}</Text>
          <Text style={styles.muted}>{toUserMessage(statsQuery.error)}</Text>
        </View>
      ) : stats ? (
        <View style={styles.statsCard}>
          <Text style={styles.statsCardCaption}>
            {fill(t('home.weekCaption'), {
              start: toMonthDay(stats.weekRange.start),
              end: toMonthDay(stats.weekRange.end),
            })}
          </Text>
          <View style={styles.statsCardRow}>
            <View style={styles.statsCardLeft}>
              <Text style={styles.statsBigNumber}>{stats.weekSends}</Text>
              <Text style={styles.statsCardSubLabel}>
                {fill(t('home.weekSendsCardSummary'), {
                  n: stats.weekSessions,
                })}
              </Text>
            </View>
            <View style={styles.statsCardRight}>
              <Text style={styles.statsTopGrade}>
                {stats.topGrade ?? t('home.topGradeEmpty')}
              </Text>
              <Text style={styles.statsCardSubLabel}>
                {t('home.topGradeCardLabel')}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <PrimaryButton
        onPress={() => navigation.navigate('StartSession')}
        accessibilityLabel={t('home.ctaStartSession')}
      >
        {t('home.ctaStartSession')}
      </PrimaryButton>

      {stats && stats.totalSessions === 0 ? (
        <View style={styles.emptyBlock}>
          <CrimpIcon.flame size={48} color={theme.accent.base} />
          <Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text>
          <Text style={styles.muted}>{t('home.emptyHint')}</Text>
        </View>
      ) : (
        <View style={styles.recentBlock}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>{t('home.recentSessionsTitle')}</Text>
            <Pressable
              onPress={() => navigation.getParent<TabsNav>()?.navigate('SessionsTab')}
              accessibilityRole="button"
              accessibilityLabel={t('home.recentSessionsSeeAll')}
              hitSlop={8}
              style={({ pressed }) => [
                styles.recentSeeAllPress,
                pressed ? styles.recentSeeAllPressed : null,
              ]}
            >
              <Text style={styles.recentSeeAllLabel}>
                {t('home.recentSessionsSeeAll')}
              </Text>
            </Pressable>
          </View>
          {sessionsQuery.isLoading ? (
            <>
              <Skeleton height={72} radius={radius.lg} />
              <View style={{ height: space[2] }} />
              <Skeleton height={72} radius={radius.lg} />
            </>
          ) : recent.length > 0 ? (
            recent.map((s) => (
              <RecentSessionCard
                key={s.extId}
                session={s}
                styles={styles}
                theme={theme}
                onPress={() =>
                  navigation.navigate('SessionDetail', { extId: s.extId })
                }
              />
            ))
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}
