import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CrimpIcon, Skeleton } from '@/components/common/primitives';
import { AuthHydrationGate } from '@/components/common/screen/AuthHydrationGate';
import { useMeetupsQuery } from '@/hooks/queries/useCrews';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
  type Theme,
} from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';
import type { CrewMeetup } from '@/lib/schemas/crew';
import type { RootStackNavigationProp } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

export default function MeetupListScreen(): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);

  return (
    <AuthHydrationGate
      hydrated={hydrated}
      accessToken={accessToken}
      loginTitleKey="crew.loginRequiredTitle"
      loginDescriptionKey="crew.loginRequiredDescription"
    >
      {(token) => (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <MeetupListContent accessToken={token} />
        </SafeAreaView>
      )}
    </AuthHydrationGate>
  );
}

function MeetupListContent({ accessToken }: { accessToken: string }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation<RootStackNavigationProp<'MeetupList'>>();
  const meetupsQuery = useMeetupsQuery(accessToken, 30);

  const renderItem: ListRenderItem<CrewMeetup> = ({ item }) => (
    <MeetupCard meetup={item} onPress={() => navigation.navigate('MeetupDetail', { extId: item.extId })} />
  );

  const header = (
    <View style={styles.headerStack}>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>MEETUP</Text>
          <Text style={styles.title}>{t('meetup.list.title')}</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('MeetupForm')}
          accessibilityRole="button"
          accessibilityLabel={t('crew.meetup.createCta')}
          style={({ pressed }) => [styles.createButton, pressed ? styles.pressed : null]}
        >
          <CrimpIcon.plus size={20} color={theme.bg} />
        </Pressable>
      </View>
      <View style={styles.quickTabs}>
        {['전체', '근처', '입문', '중급', '리드', '외벽'].map((label, index) => (
          <View key={label} style={[styles.quickTab, index === 0 ? styles.quickTabActive : null]}>
            <Text style={[styles.quickTabText, index === 0 ? styles.quickTabTextActive : null]}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  if (meetupsQuery.isLoading) {
    return (
      <View style={styles.content}>
        {header}
        <Skeleton height={110} radius={radius.lg} />
        <Skeleton height={110} radius={radius.lg} />
      </View>
    );
  }

  if (meetupsQuery.error) {
    return (
      <View style={styles.content}>
        {header}
        <StateCard title={t('meetup.list.errorTitle')} body={toUserMessage(meetupsQuery.error)} />
      </View>
    );
  }

  const items = meetupsQuery.data?.items ?? [];
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.extId}
      contentContainerStyle={styles.content}
      ListHeaderComponent={header}
      ItemSeparatorComponent={ItemSeparator}
      ListEmptyComponent={<StateCard title={t('meetup.list.emptyTitle')} body={t('meetup.list.emptyBody')} />}
      renderItem={renderItem}
      ListFooterComponent={meetupsQuery.isFetching ? <ActivityIndicator color={theme.accent.base} /> : null}
    />
  );
}

function MeetupCard({ meetup, onPress }: { meetup: CrewMeetup; onPress: () => void }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.dateBox}>
        <Text style={styles.dateMonth}>{formatMonthDay(meetup.startsAt).month}</Text>
        <Text style={styles.dateDay}>{formatMonthDay(meetup.startsAt).day}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{meetup.title}</Text>
          <Text style={styles.liveBadge}>{meetup.joinPolicy === 'OPEN' ? 'OPEN' : '승인'}</Text>
        </View>
        <Text style={styles.cardMeta}>{meetup.crewName ?? t('meetup.detail.crewLabel')} · {formatTime(meetup.startsAt)}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {meetup.gymName ?? meetup.location ?? t('crew.meetup.noGymSelected')}
        </Text>
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: capacityPercent(meetup.participantCount, meetup.capacity) }]} />
          </View>
          <Text style={styles.progressText}>{participantValue(meetup.participantCount, meetup.capacity)}</Text>
        </View>
      </View>
      <View style={styles.joinPill}>
        <Text style={styles.joinPillText}>
          {meetup.myParticipation === 'JOINED' ? '참여중' : meetup.myParticipation === 'PENDING' ? '대기' : '참여'}
        </Text>
      </View>
    </Pressable>
  );
}

function StateCard({ title, body }: { title: string; body: string }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
    </View>
  );
}

function ItemSeparator(): JSX.Element {
  return <View style={{ height: space[3] }} />;
}

function formatMonthDay(value: string): { month: string; day: string } {
  const date = new Date(value);
  return {
    month: new Intl.DateTimeFormat('ko-KR', { month: 'short' }).format(date),
    day: new Intl.DateTimeFormat('ko-KR', { day: 'numeric' }).format(date),
  };
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function participantValue(count: number, capacity: number | null): string {
  return capacity == null ? String(count) : `${count}/${capacity}`;
}

function capacityPercent(count: number, capacity: number | null): `${number}%` {
  if (capacity == null || capacity <= 0) {
    return '42%';
  }
  return `${Math.min(100, Math.max(6, Math.round((count / capacity) * 100)))}%`;
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.bg },
    content: {
      paddingHorizontal: space[5],
      paddingTop: space[2],
      paddingBottom: space[10],
      gap: space[3],
      backgroundColor: theme.bg,
    },
    headerStack: { gap: space[3], marginBottom: space[1] },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space[3],
    },
    titleBlock: { flex: 1, gap: space[1] },
    eyebrow: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.extrabold,
      color: theme.text3,
    },
    title: {
      fontFamily,
      fontSize: fontSize.h1,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: letterSpacing.h1,
    },
    subtitle: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.medium,
      color: theme.text3,
    },
    createButton: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: theme.text,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickTabs: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space[2],
    },
    quickTab: {
      minHeight: 34,
      borderRadius: radius.full,
      backgroundColor: theme.chip,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space[4],
    },
    quickTabActive: {
      backgroundColor: theme.text,
    },
    quickTabText: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.extrabold,
      color: theme.text2,
    },
    quickTabTextActive: {
      color: theme.bg,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      borderRadius: radius.xl,
      backgroundColor: theme.subtle,
      padding: space[4],
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.hairline,
    },
    dateBox: {
      width: 58,
      height: 64,
      borderRadius: radius.lg,
      backgroundColor: theme.accent.base,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateMonth: {
      fontFamily,
      fontSize: 11,
      fontWeight: fontWeight.bold,
      color: theme.text3,
    },
    dateDay: {
      fontFamily,
      fontSize: 22,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      includeFontPadding: false,
    },
    cardBody: { flex: 1, minWidth: 0, gap: space[1] },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
    },
    cardTitle: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: letterSpacing.title,
    },
    cardMeta: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.medium,
      color: theme.text2,
    },
    liveBadge: {
      flexShrink: 0,
      overflow: 'hidden',
      borderRadius: radius.full,
      backgroundColor: theme.accent.base,
      paddingHorizontal: space[2],
      fontFamily,
      fontSize: 10,
      fontWeight: fontWeight.extrabold,
      color: theme.accent.on,
    },
    progressRow: {
      marginTop: space[2],
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
    },
    progressTrack: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.hairline,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 2,
      backgroundColor: theme.text,
    },
    progressText: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.extrabold,
      color: theme.text2,
    },
    joinPill: {
      minWidth: 48,
      minHeight: 36,
      borderRadius: radius.full,
      backgroundColor: theme.text,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space[3],
    },
    joinPillText: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.extrabold,
      color: theme.bg,
    },
    stateCard: {
      borderRadius: radius.xl,
      backgroundColor: theme.subtle,
      padding: space[5],
      gap: space[2],
    },
    stateTitle: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    stateBody: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      color: theme.text2,
      lineHeight: fontSize.body * 1.5,
    },
    pressed: { opacity: 0.85 },
  });
}
