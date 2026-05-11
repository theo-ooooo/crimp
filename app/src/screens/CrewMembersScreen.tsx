import { useRoute, type RouteProp } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Skeleton } from '@/components/common/primitives';
import { AuthHydrationGate } from '@/components/common/screen/AuthHydrationGate';
import { useCrewMembersQuery, useRemoveCrewMember } from '@/hooks/queries/useCrews';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t, type MessageKey } from '@/lib/i18n';
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
import type { CrewMember } from '@/lib/schemas/crew';
import type { RootStackParamList } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

const PAGE_SIZE = 30;

export default function CrewMembersScreen(): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);
  const route = useRoute<RouteProp<RootStackParamList, 'CrewMembers'>>();
  const { crewExtId, crewName, managerRole } = route.params;

  return (
    <AuthHydrationGate
      hydrated={hydrated}
      accessToken={accessToken}
      loginTitleKey="crew.loginRequiredTitle"
      loginDescriptionKey="crew.loginRequiredDescription"
    >
      {(token) => (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <CrewMembersContent
            accessToken={token}
            crewExtId={crewExtId}
            crewName={crewName}
            managerRole={managerRole}
          />
        </SafeAreaView>
      )}
    </AuthHydrationGate>
  );
}

function CrewMembersContent({
  accessToken,
  crewExtId,
  crewName,
  managerRole,
}: {
  accessToken: string;
  crewExtId: string;
  crewName?: string;
  managerRole?: 'OWNER' | 'ADMIN';
}): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const query = useCrewMembersQuery(accessToken, crewExtId, PAGE_SIZE);
  const removeMember = useRemoveCrewMember(accessToken);
  const [activeUserExtId, setActiveUserExtId] = useState<string | null>(null);
  const members: CrewMember[] = query.data?.pages.flatMap((p) => p.items) ?? [];

  const onRefresh = useCallback(() => {
    query.refetch().catch(() => {
      /* error 상태로 노출 */
    });
  }, [query]);

  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage().catch(() => {
        /* 페이지 실패 무시 */
      });
    }
  }, [query]);

  const confirmRemove = useCallback((member: CrewMember) => {
    const nickname = member.nickname ?? t('crew.members.nicknameFallback');
    Alert.alert(
      t('crew.members.removeConfirmTitle'),
      t('crew.members.removeConfirmBody').replace('{{nickname}}', nickname),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('crew.members.removeCta'),
          style: 'destructive',
          onPress: () => {
            setActiveUserExtId(member.userExtId);
            removeMember.mutate(
              { crewExtId, userExtId: member.userExtId },
              { onSettled: () => setActiveUserExtId(null) },
            );
          },
        },
      ],
    );
  }, [crewExtId, removeMember]);

  const renderItem = useCallback<ListRenderItem<CrewMember>>(
    ({ item }) => {
      const adminLocked = managerRole === 'ADMIN' && item.role === 'ADMIN';
      return (
        <MemberCard
          member={item}
          busy={removeMember.isPending && activeUserExtId === item.userExtId}
          disabled={removeMember.isPending || item.role === 'OWNER' || adminLocked}
          lockedLabel={adminLocked ? t('crew.members.adminLocked') : undefined}
          onRemove={() => confirmRemove(item)}
        />
      );
    },
    [activeUserExtId, confirmRemove, managerRole, removeMember.isPending],
  );

  const header = (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>{crewName ?? t('crew.members.crewFallback')}</Text>
      <Text style={styles.title}>{t('crew.members.title')}</Text>
      <Text style={styles.subtitle}>{t('crew.members.subtitle')}</Text>
      {removeMember.error ? (
        <Text style={styles.errorText}>{toUserMessage(removeMember.error)}</Text>
      ) : null}
    </View>
  );

  if (query.isLoading) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        {header}
        <Skeleton height={92} radius={radius.xl} />
        <Skeleton height={92} radius={radius.xl} />
        <Skeleton height={92} radius={radius.xl} />
      </ScrollView>
    );
  }

  if (query.error) {
    return (
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.accent.base}
          />
        )}
      >
        {header}
        <StateCard title={t('crew.members.errorTitle')} body={toUserMessage(query.error)} />
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={members}
      keyExtractor={(item) => item.userExtId}
      contentContainerStyle={
        members.length === 0 ? [styles.content, styles.flexContent] : styles.content
      }
      ListHeaderComponent={header}
      ListEmptyComponent={<StateCard title={t('crew.members.emptyTitle')} body={t('crew.members.emptyBody')} />}
      ItemSeparatorComponent={ItemSeparator}
      renderItem={renderItem}
      refreshControl={(
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={onRefresh}
          tintColor={theme.accent.base}
        />
      )}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        query.isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator color={theme.accent.base} />
          </View>
        ) : null
      }
    />
  );
}

function MemberCard({
  member,
  busy,
  disabled,
  lockedLabel,
  onRemove,
}: {
  member: CrewMember;
  busy: boolean;
  disabled: boolean;
  lockedLabel?: string;
  onRemove: () => void;
}): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const nickname = member.nickname ?? t('crew.members.nicknameFallback');

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{nickname.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.cardTitleBlock}>
        <Text style={styles.cardTitle} numberOfLines={1}>{nickname}</Text>
        <Text style={styles.cardMeta}>
          {t(`crew.members.role.${member.role}` as MessageKey)} · {formatDate(member.joinedAt)}
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator color={theme.accent.base} />
      ) : (
        <Pressable
          onPress={onRemove}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          style={({ pressed }) => [
            styles.removeButton,
            disabled ? styles.removeButtonDisabled : null,
            pressed && !disabled ? styles.pressed : null,
          ]}
        >
          <Text style={[styles.removeText, disabled ? styles.removeTextDisabled : null]}>
            {member.role === 'OWNER'
              ? t('crew.members.ownerLocked')
              : lockedLabel ?? t('crew.members.removeCta')}
          </Text>
        </Pressable>
      )}
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

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    month: '2-digit',
    day: '2-digit',
  });
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    content: {
      paddingHorizontal: space[5],
      paddingTop: space[3],
      paddingBottom: space[10],
      gap: space[3],
      backgroundColor: theme.bg,
    },
    flexContent: {
      flexGrow: 1,
    },
    header: {
      gap: space[2],
      marginBottom: space[2],
    },
    eyebrow: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
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
    card: {
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
      padding: space[4],
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      ...shadow.xs,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: radius.lg,
      backgroundColor: theme.accent.soft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: letterSpacing.title,
    },
    cardTitleBlock: {
      flex: 1,
      minWidth: 0,
      gap: 2,
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
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    removeButton: {
      minHeight: 40,
      borderRadius: radius.full,
      backgroundColor: theme.bg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space[4],
    },
    removeButtonDisabled: {
      backgroundColor: theme.subtle2,
    },
    removeText: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
    },
    removeTextDisabled: {
      color: theme.text3,
    },
    pressed: {
      opacity: 0.82,
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
    errorText: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: theme.semantic.danger,
    },
    footer: {
      paddingVertical: space[5],
    },
  });
}
