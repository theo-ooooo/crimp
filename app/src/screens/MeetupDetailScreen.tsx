import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton, SecondaryButton, Skeleton } from '@/components/common/primitives';
import { AuthHydrationGate } from '@/components/common/screen/AuthHydrationGate';
import {
  useDecideMeetupParticipant,
  useDeleteMeetup,
  useJoinMeetup,
  useLeaveMeetup,
  useMeetupParticipantsQuery,
  useMeetupQuery,
} from '@/hooks/queries/useCrews';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t, type MessageKey } from '@/lib/i18n';
import { fontFamily, fontSize, fontWeight, letterSpacing, radius, space, type Theme } from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';
import type { RootStackNavigationProp, RootStackParamList } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

export default function MeetupDetailScreen(): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);
  const route = useRoute<RouteProp<RootStackParamList, 'MeetupDetail'>>();

  return (
    <AuthHydrationGate
      hydrated={hydrated}
      accessToken={accessToken}
      loginTitleKey="crew.loginRequiredTitle"
      loginDescriptionKey="crew.loginRequiredDescription"
    >
      {(token) => (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <MeetupDetailContent accessToken={token} extId={route.params.extId} />
        </SafeAreaView>
      )}
    </AuthHydrationGate>
  );
}

function MeetupDetailContent({ accessToken, extId }: { accessToken: string; extId: string }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation<RootStackNavigationProp<'MeetupDetail'>>();
  const meetupQuery = useMeetupQuery(accessToken, extId);
  const joinMeetup = useJoinMeetup(accessToken);
  const leaveMeetup = useLeaveMeetup(accessToken);
  const deleteMeetup = useDeleteMeetup(accessToken);
  const decideParticipant = useDecideMeetupParticipant(accessToken);
  const [requestMessage, setRequestMessage] = useState('');
  const meetup = meetupQuery.data;
  const activeParticipantsQuery = useMeetupParticipantsQuery(accessToken, extId, 'ACTIVE', Boolean(meetup));
  const pendingParticipantsQuery = useMeetupParticipantsQuery(accessToken, extId, 'PENDING', Boolean(meetup?.canManage));
  const busy = joinMeetup.isPending || leaveMeetup.isPending || deleteMeetup.isPending || decideParticipant.isPending;
  const error = meetupQuery.error
    ?? joinMeetup.error
    ?? leaveMeetup.error
    ?? deleteMeetup.error
    ?? decideParticipant.error
    ?? activeParticipantsQuery.error
    ?? pendingParticipantsQuery.error;

  if (meetupQuery.isLoading) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Skeleton height={190} radius={radius.xl} />
        <Skeleton height={130} radius={radius.xl} />
      </ScrollView>
    );
  }

  if (!meetup) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <StateCard title={t('meetup.detail.errorTitle')} body={error ? toUserMessage(error) : t('error.notFound')} />
      </ScrollView>
    );
  }

  const primaryText = meetup.myParticipation === 'JOINED'
    ? t('meetup.detail.leaveCta')
    : meetup.myParticipation === 'PENDING'
      ? t('meetup.detail.cancelRequestCta')
      : meetup.joinPolicy === 'APPROVAL'
        ? t('meetup.detail.requestCta')
        : t('meetup.detail.joinCta');
  const canJoinOrLeave = !meetup.canManage;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>
          {t(`meetup.joinPolicy.${meetup.joinPolicy}` as MessageKey)} · {meetup.crewName ?? '크루 무관'}
        </Text>
        <Text style={styles.title}>{meetup.title}</Text>
        <View style={styles.heroDivider} />
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>{t('crew.meetup.startsAtLabel')}</Text>
            <Text style={styles.heroStatValue}>{formatDateTime(meetup.startsAt)}</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>{t('crew.meetup.locationLabel')}</Text>
            <Text style={styles.heroStatValue}>{meetup.gymName ?? meetup.location ?? t('crew.meetup.noGymSelected')}</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>{t('meetup.detail.participantsLabel')}</Text>
            <Text style={styles.heroStatValue}>{participantValue(meetup.participantCount, meetup.capacity)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('meetup.detail.infoTitle')}</Text>
        <InfoRow label={t('meetup.detail.participantsLabel')} value={participantValue(meetup.participantCount, meetup.capacity)} />
        {meetup.host ? <InfoRow label={t('meetup.detail.hostLabel')} value={meetup.host.nickname ?? t('home.nicknameFallback')} /> : null}
        {meetup.crewName ? <InfoRow label={t('meetup.detail.crewLabel')} value={meetup.crewName} /> : null}
        <Text style={styles.bodyText}>{meetup.description ?? t('meetup.detail.descriptionFallback')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('meetup.detail.participantListTitle')}</Text>
        {(activeParticipantsQuery.data?.items ?? []).length > 0 ? (
          activeParticipantsQuery.data?.items.map((participant) => (
            <ParticipantRow
              key={participant.userExtId ?? participant.nickname ?? participant.joinedAt}
              nickname={participant.nickname ?? t('home.nicknameFallback')}
              meta={formatDateTime(participant.joinedAt)}
            />
          ))
        ) : (
          <Text style={styles.bodyText}>{t('meetup.detail.participantEmpty')}</Text>
        )}
      </View>

      {meetup.canManage ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('meetup.detail.pendingListTitle')}</Text>
          {(pendingParticipantsQuery.data?.items ?? []).length > 0 ? (
            pendingParticipantsQuery.data?.items.map((participant) => {
              const participantUserExtId = participant.userExtId;
              return (
                <View key={participantUserExtId ?? participant.nickname ?? participant.joinedAt} style={styles.requestRow}>
                  <ParticipantRow
                    nickname={participant.nickname ?? t('home.nicknameFallback')}
                    meta={participant.message ?? t('meetup.detail.pendingMessageFallback')}
                  />
                  {participantUserExtId ? (
                    <View style={styles.miniActionRow}>
                      <SecondaryButton
                        disabled={busy}
                        onPress={() => decideParticipant.mutate({
                          extId: meetup.extId,
                          userExtId: participantUserExtId,
                          decision: 'reject',
                        })}
                      >
                        {t('meetup.detail.rejectCta')}
                      </SecondaryButton>
                      <PrimaryButton
                        disabled={busy}
                        onPress={() => decideParticipant.mutate({
                          extId: meetup.extId,
                          userExtId: participantUserExtId,
                          decision: 'approve',
                        })}
                      >
                        {t('meetup.detail.approveCta')}
                      </PrimaryButton>
                    </View>
                  ) : null}
                </View>
              );
            })
          ) : (
            <Text style={styles.bodyText}>{t('meetup.detail.pendingEmpty')}</Text>
          )}
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{toUserMessage(error)}</Text> : null}

      {canJoinOrLeave && meetup.joinPolicy === 'APPROVAL' && meetup.myParticipation === 'NONE' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('meetup.detail.requestMessageTitle')}</Text>
          <TextInput
            value={requestMessage}
            onChangeText={setRequestMessage}
            placeholder={t('meetup.detail.requestMessagePlaceholder')}
            placeholderTextColor={theme.text4}
            style={[styles.input, styles.textArea]}
            multiline
            maxLength={500}
            editable={!busy}
          />
        </View>
      ) : null}

      {canJoinOrLeave ? (
        meetup.myParticipation === 'JOINED' || meetup.myParticipation === 'PENDING' ? (
          <SecondaryButton
            disabled={busy}
            onPress={() => {
              Alert.alert(t('meetup.detail.leaveConfirmTitle'), t('meetup.detail.leaveConfirmBody'), [
                { text: t('common.cancel'), style: 'cancel' },
                { text: primaryText, style: 'destructive', onPress: () => leaveMeetup.mutate(meetup.extId) },
              ]);
            }}
          >
            {busy ? t('crew.detail.processing') : primaryText}
          </SecondaryButton>
        ) : (
          <PrimaryButton
            onPress={() => joinMeetup.mutate({
              extId: meetup.extId,
              body: { message: requestMessage.trim().length > 0 ? requestMessage.trim() : null },
            })}
            disabled={busy}
          >
            {busy ? t('crew.detail.processing') : primaryText}
          </PrimaryButton>
        )
      ) : null}
      {meetup.canManage ? (
        <>
        <SecondaryButton
          disabled={busy}
          onPress={() => navigation.navigate('MeetupForm', {
            meetupExtId: meetup.extId,
            crewExtId: meetup.crewExtId ?? undefined,
            crewName: meetup.crewName ?? undefined,
            selectedGymExtId: meetup.gymExtId ?? undefined,
            selectedGymName: meetup.gymName ?? undefined,
          })}
        >
          {t('meetup.detail.editCta')}
        </SecondaryButton>
        <SecondaryButton
          disabled={busy}
          onPress={() => {
            Alert.alert(t('meetup.detail.deleteConfirmTitle'), t('meetup.detail.deleteConfirmBody'), [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('meetup.detail.deleteCta'),
                style: 'destructive',
                onPress: () => deleteMeetup.mutate(
                  { extId: meetup.extId, crewExtId: meetup.crewExtId ?? null },
                  { onSuccess: () => navigation.goBack() },
                ),
              },
            ]);
          }}
        >
          {t('meetup.detail.deleteCta')}
        </SecondaryButton>
        </>
      ) : null}
      {busy ? <ActivityIndicator color={theme.accent.base} /> : null}
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ParticipantRow({ nickname, meta }: { nickname: string; meta: string }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.participantRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{Array.from(nickname)[0] ?? '?'}</Text>
      </View>
      <View style={styles.participantTextBlock}>
        <Text style={styles.participantName} numberOfLines={1}>{nickname}</Text>
        <Text style={styles.participantMeta} numberOfLines={2}>{meta}</Text>
      </View>
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

function participantValue(count: number, capacity: number | null): string {
  return capacity == null ? `${count}` : `${count}/${capacity}`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
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
      gap: space[4],
      backgroundColor: theme.bg,
    },
    hero: {
      borderRadius: radius.xl,
      backgroundColor: theme.accent.base,
      padding: space[5],
      gap: space[3],
    },
    eyebrow: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      color: theme.accent.on,
    },
    title: {
      fontFamily,
      fontSize: fontSize.h1,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: letterSpacing.h1,
    },
    heroDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.accent.ink,
      opacity: 0.16,
    },
    heroStats: {
      flexDirection: 'row',
      gap: space[3],
    },
    heroStat: {
      flex: 1,
      minWidth: 0,
      gap: space[1],
    },
    heroStatLabel: {
      fontFamily,
      fontSize: 10,
      fontWeight: fontWeight.extrabold,
      color: theme.accent.on,
      opacity: 0.64,
    },
    heroStatValue: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.extrabold,
      color: theme.accent.on,
    },
    section: {
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
    bodyText: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      color: theme.text2,
      lineHeight: fontSize.body * 1.5,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: space[3],
    },
    infoLabel: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      color: theme.text3,
    },
    infoValue: {
      flex: 1,
      textAlign: 'right',
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    participantRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
    },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.accent.soft,
    },
    avatarText: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
    },
    participantTextBlock: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    participantName: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    participantMeta: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.medium,
      color: theme.text3,
    },
    requestRow: {
      gap: space[3],
      paddingBottom: space[3],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.hairline,
    },
    miniActionRow: {
      flexDirection: 'row',
      gap: space[2],
    },
    errorText: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: theme.semantic.danger,
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
    textArea: {
      minHeight: 96,
      textAlignVertical: 'top',
    },
  });
}
