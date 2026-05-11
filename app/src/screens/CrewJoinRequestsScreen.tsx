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
import {
  useCrewJoinRequestsQuery,
  useDecideCrewJoinRequest,
} from '@/hooks/queries/useCrews';
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
import type { CrewJoinRequestItem } from '@/lib/schemas/crew';
import type { RootStackParamList } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

const PAGE_SIZE = 20;

export default function CrewJoinRequestsScreen(): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);
  const route = useRoute<RouteProp<RootStackParamList, 'CrewJoinRequests'>>();
  const { crewExtId, crewName } = route.params;

  return (
    <AuthHydrationGate
      hydrated={hydrated}
      accessToken={accessToken}
      loginTitleKey="crew.loginRequiredTitle"
      loginDescriptionKey="crew.loginRequiredDescription"
    >
      {(token) => (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <CrewJoinRequestsContent
            accessToken={token}
            crewExtId={crewExtId}
            crewName={crewName}
          />
        </SafeAreaView>
      )}
    </AuthHydrationGate>
  );
}

function CrewJoinRequestsContent({
  accessToken,
  crewExtId,
  crewName,
}: {
  accessToken: string;
  crewExtId: string;
  crewName?: string;
}): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const query = useCrewJoinRequestsQuery(accessToken, crewExtId, 'PENDING', PAGE_SIZE);
  const decide = useDecideCrewJoinRequest(accessToken);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  const requests: CrewJoinRequestItem[] = query.data?.pages.flatMap((p) => p.items) ?? [];

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

  const decideRequest = useCallback((
    request: CrewJoinRequestItem,
    decision: 'approve' | 'reject',
  ) => {
    const title = decision === 'approve'
      ? t('crew.requests.approveConfirmTitle')
      : t('crew.requests.rejectConfirmTitle');
    const actionLabel = decision === 'approve'
      ? t('crew.requests.approveCta')
      : t('crew.requests.rejectCta');

    Alert.alert(title, request.applicant.nickname ?? t('crew.requests.nicknameFallback'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: actionLabel,
        style: decision === 'reject' ? 'destructive' : 'default',
        onPress: () => {
          setActiveRequestId(request.extId);
          decide.mutate(
            { crewExtId, requestExtId: request.extId, decision },
            {
              onSettled: () => setActiveRequestId(null),
            },
          );
        },
      },
    ]);
  }, [crewExtId, decide]);

  const renderItem = useCallback<ListRenderItem<CrewJoinRequestItem>>(
    ({ item }) => (
      <RequestCard
        request={item}
        busy={decide.isPending && activeRequestId === item.extId}
        disabled={decide.isPending}
        onApprove={() => decideRequest(item, 'approve')}
        onReject={() => decideRequest(item, 'reject')}
      />
    ),
    [activeRequestId, decide.isPending, decideRequest],
  );

  const header = (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>{crewName ?? t('crew.requests.crewFallback')}</Text>
      <Text style={styles.title}>{t('crew.requests.title')}</Text>
      <Text style={styles.subtitle}>{t('crew.requests.subtitle')}</Text>
      {decide.error ? (
        <Text style={styles.errorText}>{toUserMessage(decide.error)}</Text>
      ) : null}
    </View>
  );

  if (query.isLoading) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        {header}
        <Skeleton height={148} radius={radius.xl} />
        <Skeleton height={148} radius={radius.xl} />
        <Skeleton height={148} radius={radius.xl} />
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
        <StateCard
          title={t('crew.requests.errorTitle')}
          body={toUserMessage(query.error)}
        />
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={requests}
      keyExtractor={(item) => item.extId}
      contentContainerStyle={
        requests.length === 0 ? [styles.content, styles.flexContent] : styles.content
      }
      ListHeaderComponent={header}
      ListEmptyComponent={(
        <StateCard
          title={t('crew.requests.emptyTitle')}
          body={t('crew.requests.emptyBody')}
        />
      )}
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

function RequestCard({
  request,
  busy,
  disabled,
  onApprove,
  onReject,
}: {
  request: CrewJoinRequestItem;
  busy: boolean;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
}): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const nickname = request.applicant.nickname ?? t('crew.requests.nicknameFallback');

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{nickname.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle} numberOfLines={1}>{nickname}</Text>
          <Text style={styles.cardMeta}>{formatDate(request.createdAt)}</Text>
        </View>
        {busy ? <ActivityIndicator color={theme.accent.base} /> : null}
      </View>

      <Text style={styles.message}>
        {request.message ?? t('crew.requests.messageFallback')}
      </Text>

      <View style={styles.actionRow}>
        <DecisionButton
          label={t('crew.requests.rejectCta')}
          variant="secondary"
          disabled={disabled}
          onPress={onReject}
        />
        <DecisionButton
          label={t('crew.requests.approveCta')}
          variant="primary"
          disabled={disabled}
          onPress={onApprove}
        />
      </View>
    </View>
  );
}

function DecisionButton({
  label,
  variant,
  disabled,
  onPress,
}: {
  label: string;
  variant: 'primary' | 'secondary';
  disabled: boolean;
  onPress: () => void;
}): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.decisionButton,
        variant === 'primary' ? styles.decisionPrimary : styles.decisionSecondary,
        disabled ? styles.decisionDisabled : null,
        pressed && !disabled ? styles.decisionPressed : null,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.decisionText,
          variant === 'primary' ? styles.decisionPrimaryText : styles.decisionSecondaryText,
          disabled ? styles.decisionDisabledText : null,
        ]}
      >
        {label}
      </Text>
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

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
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
      gap: space[3],
      ...shadow.xs,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
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
    message: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.medium,
      color: theme.text2,
      lineHeight: 19,
    },
    actionRow: {
      flexDirection: 'row',
      gap: space[2],
    },
    decisionButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space[3],
    },
    decisionPrimary: {
      backgroundColor: theme.accent.base,
    },
    decisionSecondary: {
      backgroundColor: theme.bg,
    },
    decisionPressed: {
      opacity: 0.82,
    },
    decisionDisabled: {
      backgroundColor: theme.subtle2,
    },
    decisionText: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.body,
    },
    decisionPrimaryText: {
      color: theme.accent.on,
    },
    decisionSecondaryText: {
      color: theme.text,
    },
    decisionDisabledText: {
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
