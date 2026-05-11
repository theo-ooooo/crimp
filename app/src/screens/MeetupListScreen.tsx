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
  shadow,
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

  const renderItem: ListRenderItem<CrewMeetup> = ({ item }) => <MeetupCard meetup={item} />;

  const header = (
    <View style={styles.headerStack}>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{t('meetup.list.title')}</Text>
          <Text style={styles.subtitle}>{t('meetup.list.subtitle')}</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('MeetupForm')}
          accessibilityRole="button"
          accessibilityLabel={t('crew.meetup.createCta')}
          style={({ pressed }) => [styles.createButton, pressed ? styles.pressed : null]}
        >
          <CrimpIcon.plus size={18} color={theme.accent.on} />
        </Pressable>
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

function MeetupCard({ meetup }: { meetup: CrewMeetup }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.card}>
      <View style={styles.dateBox}>
        <Text style={styles.dateMonth}>{formatMonthDay(meetup.startsAt).month}</Text>
        <Text style={styles.dateDay}>{formatMonthDay(meetup.startsAt).day}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{meetup.title}</Text>
        <Text style={styles.cardMeta}>{formatTime(meetup.startsAt)}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {meetup.gymName ?? meetup.location ?? t('crew.meetup.noGymSelected')}
        </Text>
        {meetup.crewName ? <Text style={styles.cardChip}>{meetup.crewName}</Text> : null}
      </View>
    </View>
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
      backgroundColor: theme.accent.base,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      flexDirection: 'row',
      gap: space[3],
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
      padding: space[4],
      ...shadow.xs,
    },
    dateBox: {
      width: 58,
      height: 64,
      borderRadius: radius.lg,
      backgroundColor: theme.bg,
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
    cardChip: {
      alignSelf: 'flex-start',
      marginTop: space[1],
      borderRadius: radius.full,
      backgroundColor: theme.chip,
      paddingHorizontal: space[2],
      paddingVertical: space[1],
      fontFamily,
      fontSize: 11,
      fontWeight: fontWeight.bold,
      color: theme.text3,
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
