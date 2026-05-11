import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/common/primitives';
import { AuthHydrationGate } from '@/components/common/screen/AuthHydrationGate';
import { useCreateCrewMeetup } from '@/hooks/queries/useCrews';
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
import type { CreateCrewMeetupBody } from '@/lib/schemas/crew';
import type { RootStackNavigationProp, RootStackParamList } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

export default function CrewMeetupFormScreen(): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);
  const route = useRoute<RouteProp<RootStackParamList, 'CrewMeetupForm'>>();

  return (
    <AuthHydrationGate
      hydrated={hydrated}
      accessToken={accessToken}
      loginTitleKey="crew.loginRequiredTitle"
      loginDescriptionKey="crew.loginRequiredDescription"
    >
      {(token) => (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <CrewMeetupFormContent
            accessToken={token}
            crewExtId={route.params.crewExtId}
            crewName={route.params.crewName}
          />
        </SafeAreaView>
      )}
    </AuthHydrationGate>
  );
}

function CrewMeetupFormContent({
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
  const navigation = useNavigation<RootStackNavigationProp<'CrewMeetupForm'>>();
  const createMeetup = useCreateCrewMeetup(accessToken);
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [location, setLocation] = useState('');
  const [capacityText, setCapacityText] = useState('');
  const [description, setDescription] = useState('');
  const [validation, setValidation] = useState<string | null>(null);

  const submit = () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2 || trimmedTitle.length > 60) {
      setValidation(t('crew.meetup.titleValidation'));
      return;
    }
    const parsedStartsAt = parseLocalDateTime(startsAt);
    if (!parsedStartsAt) {
      setValidation(t('crew.meetup.startsAtValidation'));
      return;
    }
    const capacity = capacityText.trim().length > 0 ? Number(capacityText.trim()) : null;
    if (capacity !== null && (!Number.isInteger(capacity) || capacity < 2 || capacity > 200)) {
      setValidation(t('crew.form.capacityValidation'));
      return;
    }

    const body: CreateCrewMeetupBody = {
      title: trimmedTitle,
      startsAt: parsedStartsAt.toISOString(),
      location: toNullable(location),
      capacity,
      description: toNullable(description),
    };
    setValidation(null);
    createMeetup.mutate({ crewExtId, body }, {
      onSuccess: () => navigation.goBack(),
    });
  };

  const busy = createMeetup.isPending;
  const error = validation ?? (createMeetup.error ? toUserMessage(createMeetup.error) : null);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{t('crew.meetup.formTitle')}</Text>
        <Text style={styles.subtitle}>{crewName ?? t('crew.requests.crewFallback')}</Text>
      </View>

      <View style={styles.card}>
        <FieldLabel label={t('crew.meetup.nameLabel')} />
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('crew.meetup.namePlaceholder')}
          placeholderTextColor={theme.text4}
          style={styles.input}
          maxLength={60}
          editable={!busy}
        />

        <FieldLabel label={t('crew.meetup.startsAtLabel')} />
        <TextInput
          value={startsAt}
          onChangeText={setStartsAt}
          placeholder={t('crew.meetup.startsAtPlaceholder')}
          placeholderTextColor={theme.text4}
          style={styles.input}
          editable={!busy}
        />

        <FieldLabel label={t('crew.meetup.locationLabel')} />
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder={t('crew.meetup.locationPlaceholder')}
          placeholderTextColor={theme.text4}
          style={styles.input}
          maxLength={100}
          editable={!busy}
        />

        <FieldLabel label={t('crew.form.capacityLabel')} />
        <TextInput
          value={capacityText}
          onChangeText={setCapacityText}
          placeholder={t('crew.form.capacityPlaceholder')}
          placeholderTextColor={theme.text4}
          style={styles.input}
          keyboardType="number-pad"
          editable={!busy}
        />

        <FieldLabel label={t('crew.form.descriptionLabel')} />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t('crew.meetup.descriptionPlaceholder')}
          placeholderTextColor={theme.text4}
          style={[styles.input, styles.textArea]}
          multiline
          maxLength={500}
          editable={!busy}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <PrimaryButton onPress={submit} disabled={busy}>
        {busy ? t('crew.form.creating') : t('crew.meetup.createCta')}
      </PrimaryButton>
      {busy ? (
        <View style={styles.pendingRow}>
          <ActivityIndicator color={theme.accent.base} />
        </View>
      ) : null}
    </ScrollView>
  );
}

function FieldLabel({ label }: { label: string }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return <Text style={styles.label}>{label}</Text>;
}

function parseLocalDateTime(value: string): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }
  const [, y, m, d, hh, mm] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    content: {
      paddingHorizontal: space[5],
      paddingTop: space[1],
      paddingBottom: space[10],
      gap: space[4],
    },
    titleBlock: {
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
    card: {
      borderRadius: radius.xl,
      backgroundColor: theme.subtle,
      padding: space[5],
      gap: space[3],
    },
    label: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      color: theme.text3,
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
      minHeight: 112,
      textAlignVertical: 'top',
    },
    errorText: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: theme.semantic.danger,
    },
    pendingRow: {
      minHeight: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
