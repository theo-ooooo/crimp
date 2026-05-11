import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton, SecondaryButton, Skeleton } from '@/components/common/primitives';
import { AuthHydrationGate } from '@/components/common/screen/AuthHydrationGate';
import {
  useCancelMyCrewJoinRequest,
  useCrewQuery,
  useCrewMeetupsQuery,
  useLeaveCrew,
  useRequestCrewJoin,
} from '@/hooks/queries/useCrews';
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
  CrewDetail,
  CrewLevelBand,
  CrewMyStatus,
  CrewStyle,
} from '@/lib/schemas/crew';
import type { RootStackNavigationProp, RootStackParamList } from '@/navigation/types';
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
  const meetupsQuery = useCrewMeetupsQuery(accessToken, extId, 5);
  const requestJoin = useRequestCrewJoin(accessToken);
  const cancelJoin = useCancelMyCrewJoinRequest(accessToken);
  const leaveCrew = useLeaveCrew(accessToken);
  const navigation = useNavigation<RootStackNavigationProp<'CrewDetail'>>();
  const [joinMessage, setJoinMessage] = useState('');

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

  const pending = requestJoin.isPending || cancelJoin.isPending || leaveCrew.isPending;
  const mutationError = requestJoin.error ?? cancelJoin.error ?? leaveCrew.error;

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
        {crew.imageUrl ? (
          <Image source={{ uri: crew.imageUrl }} style={styles.heroImage} />
        ) : null}
        <View style={styles.statGrid}>
          <StatCard label={t('crew.detail.memberLabel')} value={memberValue(crew)} />
          <StatCard label={t('crew.detail.ownerLabel')} value={crew.owner.nickname ?? t('home.nicknameFallback')} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('crew.detail.infoTitle')}</Text>
        {crew.myStatus === 'OWNER' || crew.myStatus === 'ADMIN' ? (
          <SecondaryButton onPress={() => navigation.navigate('CrewForm', { extId: crew.extId })}>
            {t('crew.detail.editCta')}
          </SecondaryButton>
        ) : null}
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
        {crew.myStatus === 'NONE' && crew.joinPolicy === 'APPROVAL' ? (
          <TextInput
            value={joinMessage}
            onChangeText={setJoinMessage}
            placeholder={t('crew.detail.joinMessagePlaceholder')}
            placeholderTextColor={theme.text4}
            style={[styles.input, styles.textAreaSmall]}
            multiline
            maxLength={500}
            editable={!pending}
          />
        ) : null}
        <JoinAction
          crew={crew}
          disabled={pending}
          onRequest={() => requestJoin.mutate({
            crewExtId: crew.extId,
            body: { message: joinMessage.trim().length > 0 ? joinMessage.trim() : null },
          })}
          onCancel={() => cancelJoin.mutate(crew.extId)}
          onLeave={() => {
            Alert.alert(
              t('crew.detail.leaveConfirmTitle'),
              t('crew.detail.leaveConfirmBody'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('crew.detail.leaveCrewCta'),
                  style: 'destructive',
                  onPress: () => leaveCrew.mutate(crew.extId),
                },
              ],
            );
          }}
          onManageRequests={() => navigation.navigate('CrewJoinRequests', {
            crewExtId: crew.extId,
            crewName: crew.name,
          })}
          onManageMembers={() => navigation.navigate('CrewMembers', {
            crewExtId: crew.extId,
            crewName: crew.name,
            managerRole: crew.myStatus === 'OWNER' || crew.myStatus === 'ADMIN' ? crew.myStatus : undefined,
          })}
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

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('crew.meetup.title')}</Text>
          {crew.myStatus === 'OWNER' || crew.myStatus === 'ADMIN' ? (
            <SecondaryButton
              onPress={() => navigation.navigate('MeetupForm', {
                crewExtId: crew.extId,
                crewName: crew.name,
              })}
            >
              {t('crew.meetup.createCta')}
            </SecondaryButton>
          ) : null}
        </View>
        {meetupsQuery.isLoading ? (
          <View style={styles.pendingRow}>
            <ActivityIndicator color={theme.accent.base} />
          </View>
        ) : meetupsQuery.data?.items.length ? (
          <View style={styles.meetupList}>
            {meetupsQuery.data.items.map((meetup) => (
              <Pressable
                key={meetup.extId}
                onPress={() => navigation.navigate('MeetupDetail', { extId: meetup.extId })}
                accessibilityRole="button"
                style={({ pressed }) => [styles.meetupItem, pressed ? styles.cardPressed : null]}
              >
                <Text style={styles.meetupTitle}>{meetup.title}</Text>
                <Text style={styles.meetupMeta}>{formatMeetupTime(meetup.startsAt)}</Text>
                {meetup.location ? <Text style={styles.meetupMeta}>{meetup.location}</Text> : null}
                <Text style={styles.meetupMeta}>
                  {t('meetup.detail.participantCount').replace('{{count}}', String(meetup.participantCount))}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.bodyText}>{t('crew.meetup.emptyBody')}</Text>
        )}
      </View>
    </ScrollView>
  );
}

function JoinAction({
  crew,
  disabled,
  onRequest,
  onCancel,
  onLeave,
  onManageRequests,
  onManageMembers,
}: {
  crew: CrewDetail;
  disabled: boolean;
  onRequest: () => void;
  onCancel: () => void;
  onLeave: () => void;
  onManageRequests: () => void;
  onManageMembers: () => void;
}): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (crew.myStatus === 'OWNER' || crew.myStatus === 'ADMIN') {
    return (
      <View style={styles.adminActionColumn}>
        <SecondaryButton onPress={onManageRequests}>
          {t('crew.detail.manageRequestsCta')}
        </SecondaryButton>
        <SecondaryButton onPress={onManageMembers}>
          {t('crew.detail.manageMembersCta')}
        </SecondaryButton>
      </View>
    );
  }
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
  if (crew.myStatus === 'MEMBER') {
    return (
      <SecondaryButton onPress={onLeave} disabled={disabled}>
        {disabled ? t('crew.detail.processing') : t('crew.detail.leaveCrewCta')}
      </SecondaryButton>
    );
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

function formatMeetupTime(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: space[10],
      gap: space[3],
      backgroundColor: theme.bg,
    },
    safeArea: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    hero: {
      borderRadius: 0,
      backgroundColor: theme.accent.base,
      padding: space[5],
      paddingTop: space[8],
      paddingBottom: space[6],
      gap: space[2],
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
      color: theme.accent.on,
      letterSpacing: letterSpacing.h1,
    },
    heroSummary: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.medium,
      color: theme.accent.on,
      lineHeight: 19,
      opacity: 0.82,
      marginBottom: space[2],
    },
    heroImage: {
      width: '100%',
      height: 136,
      borderRadius: radius.lg,
      marginVertical: space[2],
    },
    statGrid: {
      flexDirection: 'row',
      gap: space[3],
    },
    statCard: {
      flex: 1,
      borderRadius: radius.lg,
      backgroundColor: 'rgba(255, 255, 255, 0.34)',
      padding: space[4],
      gap: space[1],
    },
    statLabel: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      color: theme.accent.on,
      opacity: 0.72,
    },
    statValue: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.extrabold,
      color: theme.accent.on,
      letterSpacing: letterSpacing.title,
    },
    section: {
      marginHorizontal: space[5],
      borderRadius: radius.xl,
      backgroundColor: theme.subtle,
      padding: space[5],
      gap: space[3],
    },
    sectionTitle: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: letterSpacing.title,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space[3],
    },
    meetupList: {
      gap: space[2],
    },
    meetupItem: {
      borderRadius: radius.lg,
      backgroundColor: theme.text,
      padding: space[4],
      gap: space[2],
    },
    cardPressed: {
      opacity: 0.86,
    },
    meetupTitle: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.bg,
    },
    meetupMeta: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.medium,
      color: theme.text4,
    },
    bodyText: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      color: theme.text2,
      lineHeight: fontSize.body * 1.5,
    },
    input: {
      minHeight: 48,
      borderRadius: radius.lg,
      backgroundColor: theme.bg,
      color: theme.text,
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      letterSpacing: letterSpacing.body,
      paddingHorizontal: space[4],
      paddingVertical: space[3],
    },
    textAreaSmall: {
      minHeight: 92,
      textAlignVertical: 'top',
    },
    adminActionColumn: {
      gap: space[2],
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
      backgroundColor: theme.chip,
      paddingHorizontal: space[3],
      paddingVertical: space[1],
    },
    statusText: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.extrabold,
      color: theme.text3,
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
