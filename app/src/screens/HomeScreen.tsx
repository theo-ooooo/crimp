import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  BigStat,
  CrimpIcon,
  PrimaryButton,
  SecondaryButton,
  Skeleton,
} from '@/components/primitives';
import { useMeStatsQuery } from '@/hooks/useMeStats';
import { useMeQuery } from '@/hooks/useMe';
import { useSessionsQuery } from '@/hooks/useSessions';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
  withAlpha,
  type Theme,
} from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';
import type { Session } from '@/lib/schemas/session';
import type { RootStackParamList } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

function fill(key: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replace(`{{${k}}}`, String(v)),
    key,
  );
}

/** "2026-04-20" → "04-20" */
function toMonthDay(iso: string): string {
  return iso.length >= 10 ? iso.slice(5) : iso;
}

export default function HomeScreen(): JSX.Element {
  const theme = useTokens();
  const navigation = useNavigation<Nav>();
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!hydrated) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.muted}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!accessToken) {
    return <LoggedOutView navigation={navigation} styles={styles} />;
  }

  return <LoggedInView accessToken={accessToken} navigation={navigation} styles={styles} theme={theme} />;
}

function LoggedOutView({
  navigation,
  styles,
}: {
  navigation: Nav;
  styles: ReturnType<typeof makeStyles>;
}): JSX.Element {
  return (
    <View style={[styles.container, styles.center]}>
      <Text style={styles.brand}>{t('common.brand')}</Text>
      <Text style={styles.heroTagline}>{t('home.tagline')}</Text>
      <Text style={styles.heroDescription}>{t('home.description')}</Text>
      <View style={styles.heroButton}>
        <SecondaryButton
          onPress={() => navigation.navigate('Login')}
          accessibilityLabel={t('home.loginCta')}
        >
          {t('home.loginCta')}
        </SecondaryButton>
      </View>
      <Text style={styles.loginPrompt}>{t('home.loginPrompt')}</Text>
    </View>
  );
}

type LoggedInProps = {
  accessToken: string;
  navigation: Nav;
  styles: ReturnType<typeof makeStyles>;
  theme: Theme;
};

function LoggedInView({ accessToken, navigation, styles, theme }: LoggedInProps): JSX.Element {
  const meQuery = useMeQuery(accessToken);
  const statsQuery = useMeStatsQuery(accessToken);
  const sessionsQuery = useSessionsQuery(accessToken);

  const nickname = meQuery.data?.nickname ?? t('home.nicknameFallback');
  const stats = statsQuery.data;
  const recent: Session[] =
    sessionsQuery.data?.pages.flatMap((p) => p.items).slice(0, 3) ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {/* 인사말 */}
      <View style={styles.greetingBlock}>
        <Text style={styles.eyebrow}>{t('home.eyebrow')}</Text>
        <Text style={styles.greeting}>
          {fill(t('home.greeting'), { nickname })}
        </Text>
        {stats ? (
          <Text style={styles.greeting}>
            {t('home.weeklyHeadlinePrefix')}
            <Text style={[styles.greeting, { color: theme.accent.base }]}>
              {stats.weekSends}
            </Text>
            {t('home.weeklyHeadlineSuffix')}
          </Text>
        ) : null}
      </View>

      {/* 큰 통계 카드 */}
      {statsQuery.isLoading ? (
        <View style={styles.statsCard}>
          <Skeleton width="40%" height={14} />
          <View style={{ height: space[4] }} />
          <Skeleton width="60%" height={56} />
          <View style={{ height: space[6] }} />
          <Skeleton width="100%" height={48} />
        </View>
      ) : statsQuery.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t('home.errorTitle')}</Text>
          <Text style={styles.muted}>{toUserMessage(statsQuery.error)}</Text>
        </View>
      ) : stats ? (
        <View style={styles.statsCard}>
          <Text style={styles.caption}>
            {fill(t('home.weekCaption'), {
              start: toMonthDay(stats.weekRange.start),
              end: toMonthDay(stats.weekRange.end),
            })}
          </Text>
          <View style={{ height: space[4] }} />
          <BigStat
            value={stats.weekSends}
            unit={t('home.weekSendsUnit') || undefined}
            label={t('home.weekSendsLabel')}
            scale="xl"
          />
          <View style={styles.divider} />
          <View style={styles.statsRow}>
            <BigStat
              value={stats.totalSessions}
              label={t('home.totalSessionsLabel')}
              scale="sm"
            />
            <BigStat
              value={stats.totalSends}
              label={t('home.totalSendsLabel')}
              scale="sm"
            />
            <BigStat
              value={stats.topGrade ?? t('home.topGradeEmpty')}
              label={t('home.topGradeLabel')}
              scale="sm"
            />
          </View>
        </View>
      ) : null}

      {/* 주 CTA */}
      <PrimaryButton onPress={() => navigation.navigate('StartSession')}>
        {t('home.ctaStartSession')}
      </PrimaryButton>

      {/* 최근 세션 */}
      {stats && stats.totalSessions === 0 ? (
        <View style={styles.emptyBlock}>
          <CrimpIcon.flame size={48} color={theme.accent.base} />
          <Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text>
          <Text style={styles.muted}>{t('home.emptyHint')}</Text>
        </View>
      ) : (
        <View style={styles.recentBlock}>
          <Text style={styles.sectionTitle}>{t('home.recentSessionsTitle')}</Text>
          {sessionsQuery.isLoading ? (
            <>
              <Skeleton height={64} radius={radius.lg} />
              <View style={{ height: space[2] }} />
              <Skeleton height={64} radius={radius.lg} />
            </>
          ) : recent.length > 0 ? (
            recent.map((s) => (
              <RecentSessionCard
                key={s.extId}
                session={s}
                styles={styles}
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

function RecentSessionCard({
  session,
  onPress,
  styles,
}: {
  session: Session;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}): JSX.Element {
  const label = session.gymNameRaw ?? t('session.list.itemGymFallback');
  const parsed = new Date(session.startedAt);
  const startedAt = Number.isNaN(parsed.getTime())
    ? t('common.empty')
    : parsed.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.recentCard,
        pressed ? styles.recentCardPressed : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.recentCardLabel}>{label}</Text>
      <Text style={styles.recentCardDate}>{startedAt}</Text>
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: space[6],
      gap: space[3],
    },
    scrollContent: {
      padding: space[5],
      paddingBottom: space[14],
      gap: space[6],
    },
    muted: {
      fontFamily,
      fontSize: fontSize.body,
      color: theme.text3,
    },
    brand: {
      fontFamily,
      fontSize: fontSize.h1,
      fontWeight: fontWeight.extrabold,
      letterSpacing: letterSpacing.h1,
      color: theme.text,
    },
    heroTagline: {
      fontFamily,
      fontSize: fontSize.h2,
      fontWeight: fontWeight.bold,
      color: theme.text,
      textAlign: 'center',
    },
    heroDescription: {
      fontFamily,
      fontSize: fontSize.body,
      color: theme.text2,
      textAlign: 'center',
    },
    heroButton: {
      alignSelf: 'stretch',
      marginTop: space[4],
    },
    loginPrompt: {
      fontFamily,
      fontSize: fontSize.caption,
      color: theme.text3,
    },
    greetingBlock: {
      gap: space[1],
    },
    eyebrow: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
      marginBottom: space[1],
    },
    greeting: {
      fontFamily,
      fontSize: fontSize.h1,
      fontWeight: fontWeight.extrabold,
      letterSpacing: letterSpacing.h1,
      color: theme.text,
      lineHeight: fontSize.h1 * 1.15,
    },
    statsCard: {
      backgroundColor: theme.subtle,
      borderRadius: radius.xl,
      padding: space[6],
    },
    caption: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    divider: {
      height: 1,
      backgroundColor: theme.hairline,
      marginVertical: space[5],
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: space[3],
    },
    errorBox: {
      backgroundColor: withAlpha(theme.semantic.danger, 0.08),
      borderRadius: radius.lg,
      padding: space[5],
      gap: space[2],
    },
    errorTitle: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
    },
    emptyBlock: {
      alignItems: 'center',
      padding: space[8],
      gap: space[3],
    },
    emptyTitle: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.title,
      color: theme.text,
      marginTop: space[2],
    },
    recentBlock: {
      gap: space[3],
    },
    sectionTitle: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.title,
      color: theme.text,
    },
    recentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: space[4],
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
    },
    recentCardPressed: {
      opacity: 0.85,
    },
    recentCardLabel: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      color: theme.text,
      flexShrink: 1,
    },
    recentCardDate: {
      fontFamily,
      fontSize: fontSize.caption,
      color: theme.text3,
    },
  });
}
