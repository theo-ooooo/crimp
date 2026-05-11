import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthHydrationGate } from '@/components/common/screen/AuthHydrationGate';
import { CrimpIcon, Skeleton } from '@/components/common/primitives';
import {
  useCrewListScreen,
} from '@/hooks/screens/useCrewListScreen';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t, type MessageKey } from '@/lib/i18n';
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
import type {
  CrewItem,
  CrewMyStatus,
} from '@/lib/schemas/crew';
import type { RootStackNavigationProp } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

export default function CrewListScreen(): JSX.Element {
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
          <CrewListContent accessToken={token} />
        </SafeAreaView>
      )}
    </AuthHydrationGate>
  );
}

function CrewListContent({ accessToken }: { accessToken: string }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation<RootStackNavigationProp<'CrewList'>>();
  const state = useCrewListScreen(accessToken);

  const renderItem = useCallback<ListRenderItem<CrewItem>>(
    ({ item }) => (
      <CrewCard
        crew={item}
        onPress={() => navigation.navigate('CrewDetail', { extId: item.extId })}
      />
    ),
    [navigation],
  );

  const header = (
    <View style={styles.headerStack}>
      <View style={styles.titleBlock}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t('crew.list.title')}</Text>
          <View style={styles.headerActions}>
            <View style={styles.searchIconButton}>
              <CrimpIcon.search size={18} color={theme.text} />
            </View>
            <Pressable
              onPress={() => navigation.navigate('CrewForm')}
              accessibilityRole="button"
              accessibilityLabel={t('crew.form.createCta')}
              style={({ pressed }) => [
                styles.createButton,
                pressed ? styles.cardPressed : null,
              ]}
            >
              <CrimpIcon.plus size={20} color={theme.bg} />
            </Pressable>
          </View>
        </View>
        <View style={styles.quickTabs}>
          <View style={[styles.quickTab, styles.quickTabActive]}>
            <Text style={[styles.quickTabText, styles.quickTabTextActive]}>내 크루</Text>
          </View>
          <View style={styles.quickTab}>
            <Text style={styles.quickTabText}>추천</Text>
          </View>
          <View style={styles.quickTab}>
            <Text style={styles.quickTabText}>주변</Text>
          </View>
          <View style={styles.quickTab}>
            <Text style={styles.quickTabText}>전체</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (state.isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          {header}
          <Skeleton height={126} radius={radius.xl} />
          <Skeleton height={126} radius={radius.xl} />
          <Skeleton height={126} radius={radius.xl} />
        </View>
      </View>
    );
  }

  if (state.error) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          {header}
          <StateCard
            title={t('crew.list.errorTitle')}
            body={toUserMessage(state.error)}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={state.crews}
        keyExtractor={(item) => item.extId}
        contentContainerStyle={
          state.crews.length === 0 ? [styles.content, styles.flexContent] : styles.content
        }
        ItemSeparatorComponent={ItemSeparator}
        ListHeaderComponent={header}
        ListEmptyComponent={(
          <StateCard
            title={t('crew.list.emptyTitle')}
            body={t('crew.list.emptyBody')}
          />
        )}
        renderItem={renderItem}
        refreshControl={(
          <RefreshControl
            refreshing={state.isRefetching}
            onRefresh={state.onRefresh}
            tintColor={theme.accent.base}
          />
        )}
        onEndReached={state.onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          state.isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator color={theme.accent.base} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

function CrewCard({ crew, onPress }: { crew: CrewItem; onPress: () => void }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${crew.name} ${t('crew.detail.title')}`}
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardAvatar}>
          {crew.imageUrl ? (
            <Image source={{ uri: crew.imageUrl }} style={styles.cardAvatarImage} />
          ) : (
            <View style={styles.rockMark} />
          )}
        </View>
        <View style={styles.cardTitleBlock}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{crew.name}</Text>
            <StatusBadge status={crew.myStatus} />
          </View>
          <Text style={styles.cardSummary} numberOfLines={1}>
            {formatMemberCount(crew.memberCount, crew.capacity)}
          </Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.nextMeetupRow}>
          <CrimpIcon.clock size={14} color={theme.text} />
          <Text style={styles.nextMeetupLabel}>다음 모임</Text>
          <Text style={styles.nextMeetupText} numberOfLines={1}>
            {crew.homeGym?.name ?? crew.region ?? t('crew.common.homeGymFallback')}
          </Text>
        </View>
        <View style={styles.memberRow}>
          <View style={styles.memberAvatarGroup}>
            {['민', '지', '수', '준'].map((label, index) => (
              <View key={label} style={[styles.memberAvatar, index > 0 ? styles.memberAvatarOverlap : null]}>
                <Text style={styles.memberAvatarText}>{label}</Text>
              </View>
            ))}
            <View style={[styles.memberAvatar, styles.memberAvatarMore, styles.memberAvatarOverlap]}>
              <Text style={styles.memberAvatarMoreText}>+{Math.max(0, crew.memberCount - 4)}</Text>
            </View>
          </View>
          <Text style={styles.enterText}>들어가기 →</Text>
        </View>
      </View>
    </Pressable>
  );
}

function StatusBadge({ status }: { status: CrewMyStatus }): JSX.Element | null {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  if (status === 'NONE') {
    return null;
  }
  return (
    <View style={styles.statusBadge}>
      <Text style={styles.statusText}>{statusLabel(status)}</Text>
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

function statusLabel(v: CrewMyStatus): string {
  return t(`crew.status.${v}` as MessageKey);
}

function formatMemberCount(memberCount: number, capacity: number | null): string {
  const base = t('crew.common.memberCount').replace('{{count}}', String(memberCount));
  return capacity
    ? `${base} / ${t('crew.common.capacityCount').replace('{{count}}', String(capacity))}`
    : base;
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    safeArea: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    content: {
      paddingHorizontal: space[5],
      paddingBottom: space[10],
      gap: space[3],
    },
    flexContent: {
      flexGrow: 1,
    },
    headerStack: {
      gap: space[3],
      paddingTop: space[2],
      marginBottom: space[1],
    },
    titleBlock: {
      gap: space[1],
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space[3],
    },
    createButton: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: theme.text,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      overflow: 'hidden',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
    },
    searchIconButton: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: theme.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardAvatarImage: {
      width: '100%',
      height: '100%',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      marginBottom: space[3],
    },
    cardTitleBlock: {
      flex: 1,
      minWidth: 0,
      gap: space[1],
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
    quickTabs: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space[2],
      marginTop: space[2],
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
      borderRadius: radius.xl,
      backgroundColor: theme.subtle,
      padding: space[5],
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.hairline,
    },
    cardPressed: {
      opacity: 0.85,
    },
    cardAvatar: {
      width: 56,
      height: 56,
      borderRadius: radius.lg,
      backgroundColor: theme.accent.base,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      overflow: 'hidden',
    },
    rockMark: {
      width: 30,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.text,
      transform: [{ rotate: '-4deg' }],
    },
    cardBody: {
      gap: space[3],
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space[2],
    },
    cardTitle: {
      flex: 1,
      fontFamily,
      fontSize: 17,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: letterSpacing.title,
    },
    cardSummary: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.medium,
      color: theme.text2,
      lineHeight: 19,
    },
    nextMeetupRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      borderRadius: radius.md,
      backgroundColor: theme.bg,
      paddingHorizontal: space[3],
      paddingVertical: space[3],
    },
    nextMeetupLabel: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
    },
    nextMeetupText: {
      flex: 1,
      textAlign: 'right',
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space[3],
    },
    memberAvatarGroup: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    memberAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.accent.soft,
      borderWidth: 2,
      borderColor: theme.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    memberAvatarOverlap: {
      marginLeft: -8,
    },
    memberAvatarText: {
      fontFamily,
      fontSize: 11,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
    },
    memberAvatarMore: {
      backgroundColor: theme.text,
    },
    memberAvatarMoreText: {
      fontFamily,
      fontSize: 10,
      fontWeight: fontWeight.extrabold,
      color: theme.bg,
    },
    enterText: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.extrabold,
      color: theme.text2,
    },
    statusBadge: {
      borderRadius: radius.full,
      backgroundColor: theme.chip,
      paddingHorizontal: space[2],
      paddingVertical: space[1],
      flexShrink: 0,
    },
    statusText: {
      fontFamily,
      fontSize: 11,
      fontWeight: fontWeight.extrabold,
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
      fontWeight: fontWeight.extrabold,
      color: theme.text,
    },
    stateBody: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      color: theme.text2,
      lineHeight: fontSize.body * 1.5,
    },
    footer: {
      paddingVertical: space[5],
    },
    filterLabel: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      color: theme.text3,
    },
  });
}
