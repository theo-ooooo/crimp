import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
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
import type { MainTabsParamList, RootStackParamList } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;
type TabsNav = BottomTabNavigationProp<MainTabsParamList>;

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

/**
 * 홈 대시보드.
 *
 * 디자인 출처: docs/design/claude/v2/screens-ios.jsx:55 (`HomeScreen`)
 *
 * Mock 레이아웃 정렬:
 * - 인사말 블록 (eyebrow text3 14px / headline 26px 800 + accent 강조)
 * - 큰 통계 카드 (subtle bg, radius 20, padding 24/22) — 좌측 큰 숫자, 우측 최고 그레이드
 * - 주 CTA "세션 시작하기" (PrimaryButton)
 * - 최근 세션 섹션 (제목 + "전체" 링크) — 카드 row: 아이콘 / 이름·시간 / 그레이드·count
 * - 피드/프로필 진입 카드 (Phase 1.5 BottomTabs 도입 전 placeholder; PR #55, #61 정합)
 *
 * 비즈니스 로직 무변경:
 * - useMeQuery / useMeStatsQuery / useSessionsQuery 동일 호출
 * - 토큰 hydrate 가드, LoggedOutView 분기 동일
 */
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
      {/* Greeting (mock: padding 24/20/8, eyebrow 14px text3, headline 26px 800) */}
      <View style={styles.greetingBlock}>
        <Text style={styles.eyebrow}>{t('home.eyebrow')}</Text>
        <Text style={styles.greeting}>
          {fill(t('home.greetingHeadline'), { nickname })}
        </Text>
        {stats ? (
          <Text style={styles.greeting}>
            {/* "이번 주 N회 붙었어요" — accent 색 강조는 inline 분리. */}
            {t('home.weeklyHeadlinePrefix')}
            <Text style={[styles.greeting, styles.greetingAccent]}>
              {stats.weekSends}
            </Text>
            {t('home.weeklyHeadlineSuffix')}
          </Text>
        ) : null}
      </View>

      {/* Big stats card (mock: subtle bg, radius 20, padding 24/22, 좌측 56px 큰 숫자) */}
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
            {/* 좌측: 큰 완등 수 + 보조 라인 ("완등 · 세션 N회") */}
            <View style={styles.statsCardLeft}>
              <Text style={styles.statsBigNumber}>{stats.weekSends}</Text>
              <Text style={styles.statsCardSubLabel}>
                {fill(t('home.weekSendsCardSummary'), {
                  n: stats.weekSessions,
                })}
              </Text>
            </View>
            {/* 우측: 최고 그레이드 + 라벨 */}
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

      {/* 주 CTA — mock: padding 20px, PrimaryButton */}
      <PrimaryButton
        onPress={() => navigation.navigate('StartSession')}
        accessibilityLabel={t('home.ctaStartSession')}
      >
        {t('home.ctaStartSession')}
      </PrimaryButton>

      {/* 최근 세션 (mock: 헤더 18px 700 + 우측 "전체" link / 카드 행) */}
      {stats && stats.totalSessions === 0 ? (
        <View style={styles.emptyBlock}>
          <CrimpIcon.flame size={48} color={theme.accent.base} />
          <Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text>
          <Text style={styles.muted}>{t('home.emptyHint')}</Text>
        </View>
      ) : (
        <View style={styles.recentBlock}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>
              {t('home.recentSessionsTitle')}
            </Text>
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

      {/* PR #68 BottomTabs 도입으로 피드/프로필 진입 카드는 탭바가 대체. */}
    </ScrollView>
  );
}

/**
 * 최근 세션 카드 — mock: padding 14/16, hairline border, radius 16
 *
 * 좌측: 36/44px subtle 배경 원형 핀 아이콘
 * 중앙: 암장 이름 (15px 700) + 보조 텍스트 (12px 500 text3)
 * 우측: GradeBadge sm + count "×N" — 백엔드 데이터로 보여줄 항목이 아직 없으므로
 *      Phase 1 에서는 GradeBadge 만 표시 (count 는 후속 PR 에서 sessionStats 합류).
 */
function RecentSessionCard({
  session,
  onPress,
  styles,
  theme,
}: {
  session: Session;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  theme: Theme;
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
      <View style={styles.recentCardIcon}>
        <CrimpIcon.pin size={20} color={theme.text3} />
      </View>
      <View style={styles.recentCardBody}>
        <Text style={styles.recentCardLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.recentCardDate} numberOfLines={1}>
          {startedAt}
        </Text>
      </View>
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
    /** Mock: paddingTop 64, 좌우 20, paddingBottom 110. RN 은 BottomTabs 미도입이라 14. */
    scrollContent: {
      paddingHorizontal: space[5],
      paddingTop: space[6],
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
    /** Greeting block — mock gap: eyebrow 4 / headline lines 0 (snug). */
    greetingBlock: {
      gap: space[1],
    },
    eyebrow: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
      marginBottom: space[1],
    },
    greeting: {
      fontFamily,
      fontSize: fontSize.h2,
      fontWeight: fontWeight.extrabold,
      letterSpacing: letterSpacing.h2,
      color: theme.text,
      lineHeight: fontSize.h2 * 1.15,
    },
    greetingAccent: {
      color: theme.accent.base,
    },
    /** Stats card — mock subtle bg / radius 20 / padding 24·22 / 큰 숫자 + 우측 그레이드 */
    statsCard: {
      backgroundColor: theme.subtle,
      borderRadius: radius.xl,
      paddingVertical: space[6],
      paddingHorizontal: space[5],
      gap: space[3],
    },
    statsCardCaption: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    statsCardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    statsCardLeft: {
      flexShrink: 1,
      gap: space[1],
    },
    statsCardRight: {
      alignItems: 'flex-end',
      gap: space[1],
    },
    /** Mock: fontSize 56, weight 800, letterSpacing -0.05em, lineHeight 1, tabular-nums. */
    statsBigNumber: {
      fontFamily,
      fontSize: 56,
      fontWeight: fontWeight.extrabold,
      letterSpacing: -2.8,
      lineHeight: 56,
      color: theme.text,
      includeFontPadding: false,
    },
    /** Mock 우측 최고 그레이드: fontSize 32, weight 800, accent 색. */
    statsTopGrade: {
      fontFamily,
      fontSize: 32,
      fontWeight: fontWeight.extrabold,
      letterSpacing: letterSpacing.h1,
      lineHeight: 32,
      color: theme.accent.base,
      includeFontPadding: false,
    },
    statsCardSubLabel: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
      marginTop: space[1],
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
    /** 최근 세션 블록 — mock 28/20/8 패딩 후 카드 gap 10. */
    recentBlock: {
      gap: space[3],
    },
    recentHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    /** Mock 섹션 제목: fontSize 18, weight 700, letterSpacing -0.02em. */
    sectionTitle: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.title,
      color: theme.text,
    },
    recentSeeAllPress: {
      paddingVertical: space[1],
    },
    recentSeeAllPressed: {
      opacity: 0.6,
    },
    recentSeeAllLabel: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    /** Mock 최근 세션 카드: padding 14/16, hairline border, radius 16, row gap 12. */
    recentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      borderRadius: radius.lg,
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.hairline,
    },
    recentCardPressed: {
      opacity: 0.85,
    },
    recentCardIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: theme.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recentCardBody: {
      flex: 1,
      minWidth: 0,
    },
    recentCardLabel: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.body,
      color: theme.text,
    },
    recentCardDate: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.medium,
      color: theme.text3,
      marginTop: 2,
    },
    /* 피드/프로필 진입 카드 (entryCard*, entryIcon, entryBody, entryTitle, entrySubtitle) 는
       PR #68 BottomTabs 도입으로 JSX 와 함께 제거. 같은 placeholder 가 다시 필요하면 mock 의
       카드 스타일을 다시 도입한다. */
  });
}
