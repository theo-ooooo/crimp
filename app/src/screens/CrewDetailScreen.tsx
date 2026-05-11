import { useRoute, type RouteProp } from '@react-navigation/native';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton, SecondaryButton, Skeleton } from '@/components/common/primitives';
import { AuthHydrationGate } from '@/components/common/screen/AuthHydrationGate';
import {
  useCancelMyCrewJoinRequest,
  useCrewQuery,
  useRequestCrewJoin,
} from '@/hooks/queries/useCrews';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t, type MessageKey } from '@/lib/i18n';
import {
  fontFamily,
  fontSize,
  fontWeight,
  radius,
  space,
  type Theme,
} from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';
import type {
  CrewDetail,
  CrewLevelBand,
  CrewMyStatus,
  CrewStyle,
} from '@/lib/schemas/crew';
import type { RootStackParamList } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

export default function CrewDetailScreen(): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);
  const route = useRoute<RouteProp<RootStackParamList, 'CrewDetail'>>();
  const { extId } = route.params;

  return (
    <AuthHydrationGate
      hydrated={hydrated}
      accessToken={accessToken}
      loginTitleKey="crew.loginRequiredTitle"
      loginDescriptionKey="crew.loginRequiredDescription"
    >
      {(token) => (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <CrewDetailContent accessToken={token} extId={extId} />
        </SafeAreaView>
      )}
    </AuthHydrationGate>
  );
}

function CrewDetailContent({
  accessToken,
  extId,
}: {
  accessToken: string;
  extId: string;
}): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const crewQuery = useCrewQuery(accessToken, extId);
  const requestJoin = useRequestCrewJoin(accessToken);
  const cancelJoin = useCancelMyCrewJoinRequest(accessToken);

  if (crewQuery.isLoading) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Skeleton height={228} radius={radius['2xl']} />
        <Skeleton height={150} radius={radius.xl} />
        <Skeleton height={146} radius={radius.xl} />
      </ScrollView>
    );
  }

  if (crewQuery.error) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <StateCard
          title={t('crew.detail.errorTitle')}
          body={toUserMessage(crewQuery.error)}
        />
      </ScrollView>
    );
  }

  const crew = crewQuery.data;
  if (!crew) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <StateCard title={t('crew.detail.errorTitle')} body={t('error.notFound')} />
      </ScrollView>
    );
  }

  const pending = requestJoin.isPending || cancelJoin.isPending;
  const mutationError = requestJoin.error ?? cancelJoin.error;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.badgeRow}>
          <StatusBadge status={crew.myStatus} />
          <InfoChip label={joinPolicyLabel(crew.joinPolicy)} />
        </View>
        <Text style={styles.heroTitle}>{crew.name}</Text>
        <Text style={styles.heroSummary}>
          {crew.summary ?? t('crew.common.summaryFallback')}
        </Text>
        <View style={styles.statGrid}>
          <StatCard label={t('crew.detail.memberLabel')} value={memberValue(crew)} />
          <StatCard label={t('crew.detail.ownerLabel')} value={crew.owner.nickname ?? t('home.nicknameFallback')} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('crew.detail.infoTitle')}</Text>
        <View style={styles.metaWrap}>
          <InfoChip label={crew.region ?? t('crew.common.regionFallback')} />
          <InfoChip label={crew.homeGym?.name ?? t('crew.common.homeGymFallback')} />
          <InfoChip label={levelLabel(crew.levelBand)} />
          <InfoChip label={styleLabel(crew.style)} />
        </View>
        <Text style={styles.bodyText}>
          {crew.description ?? t('crew.detail.descriptionFallback')}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('crew.detail.joinTitle')}</Text>
        <Text style={styles.bodyText}>{joinHelpText(crew.joinPolicy)}</Text>
        <JoinAction
          crew={crew}
          disabled={pending}
          onRequest={() => requestJoin.mutate({ crewExtId: crew.extId, body: { message: null } })}
          onCancel={() => cancelJoin.mutate(crew.extId)}
        />
        {pending ? (
          <View style={styles.pendingRow}>
            <ActivityIndicator color={theme.accent.base} />
          </View>
        ) : null}
        {mutationError ? (
          <Text style={styles.errorText}>{toUserMessage(mutationError)}</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

function JoinAction({
  crew,
  disabled,
  onRequest,
  onCancel,
}: {
  crew: CrewDetail;
  disabled: boolean;
  onRequest: () => void;
  onCancel: () => void;
}): JSX.Element {
  if (crew.myStatus === 'PENDING') {
    return (
      <SecondaryButton
        onPress={onCancel}
        disabled={disabled}
      >
        {disabled ? t('crew.detail.processing') : t('crew.detail.cancelRequestCta')}
      </SecondaryButton>
    );
  }
  if (crew.myStatus === 'MEMBER' || crew.myStatus === 'OWNER' || crew.myStatus === 'ADMIN') {
    return <SecondaryButton disabled>{t('crew.detail.alreadyMemberCta')}</SecondaryButton>;
  }
  if (crew.joinPolicy === 'OPEN') {
    return <SecondaryButton disabled>{t('crew.detail.openDisabledCta')}</SecondaryButton>;
  }
  if (crew.joinPolicy === 'INVITE_ONLY') {
    return <SecondaryButton disabled>{t('crew.detail.inviteOnlyCta')}</SecondaryButton>;
  }
  return (
    <PrimaryButton onPress={onRequest} disabled={disabled}>
      {disabled ? t('crew.detail.processing') : t('crew.detail.requestJoinCta')}
    </PrimaryButton>
  );
}

function StatusBadge({ status }: { status: CrewMyStatus }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.statusBadge}>
      <Text style={styles.statusText}>{t(`crew.status.${status}` as MessageKey)}</Text>
    </View>
  );
}

function InfoChip({ label }: { label: string }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.infoChip}>
      <Text style={styles.infoChipText} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function StateCard({ title, body }: { title: string; body: string }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.bodyText}>{body}</Text>
    </View>
  );
}

function levelLabel(v: CrewLevelBand): string {
  return t(`crew.level.${v}` as MessageKey);
}

function styleLabel(v: CrewStyle): string {
  return t(`crew.style.${v}` as MessageKey);
}

function joinPolicyLabel(v: CrewDetail['joinPolicy']): string {
  return t(`crew.joinPolicy.${v}` as MessageKey);
}

function joinHelpText(v: CrewDetail['joinPolicy']): string {
  return t(`crew.detail.joinHelp.${v}` as MessageKey);
}

function memberValue(crew: CrewDetail): string {
  const base = t('crew.common.memberCount').replace('{{count}}', String(crew.memberCount));
  return crew.capacity
    ? `${base} / ${t('crew.common.capacityCount').replace('{{count}}', String(crew.capacity))}`
    : base;
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: space[5],
      paddingTop: space[6],
      paddingBottom: space[10],
      gap: space[4],
      backgroundColor: theme.bg,
    },
    safeArea: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    hero: {
      borderRadius: radius['2xl'],
      backgroundColor: theme.subtle,
      padding: space[5],
      gap: space[3],
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space[2],
    },
    heroTitle: {
      fontFamily,
      fontSize: 30,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: -1.2,
      lineHeight: 36,
    },
    heroSummary: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      color: theme.text2,
      lineHeight: fontSize.body * 1.5,
    },
    statGrid: {
      flexDirection: 'row',
      gap: space[3],
    },
    statCard: {
      flex: 1,
      borderRadius: radius.xl,
      backgroundColor: theme.bg,
      padding: space[4],
      gap: space[1],
    },
    statLabel: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      color: theme.text3,
    },
    statValue: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
    },
    section: {
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.hairline,
      backgroundColor: theme.bg,
      padding: space[5],
      gap: space[3],
    },
    sectionTitle: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
    },
    bodyText: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      color: theme.text2,
      lineHeight: fontSize.body * 1.5,
    },
    metaWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space[2],
    },
    infoChip: {
      maxWidth: '100%',
      borderRadius: radius.full,
      backgroundColor: theme.chip,
      paddingHorizontal: space[3],
      paddingVertical: space[1],
    },
    infoChipText: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      color: theme.text2,
    },
    statusBadge: {
      borderRadius: radius.full,
      backgroundColor: theme.accent.soft,
      paddingHorizontal: space[3],
      paddingVertical: space[1],
    },
    statusText: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.extrabold,
      color: theme.accent.ink,
    },
    pendingRow: {
      minHeight: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: theme.semantic.danger,
    },
  });
}
