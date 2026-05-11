import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton, SecondaryButton } from '@/components/common/primitives';
import { AuthHydrationGate } from '@/components/common/screen/AuthHydrationGate';
import { useCreateMeetup, useMeetupQuery, useUpdateMeetup } from '@/hooks/queries/useCrews';
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
import type { CreateCrewMeetupBody } from '@/lib/schemas/crew';
import type { RootStackNavigationProp, RootStackParamList } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

type Step = 'basic' | 'time' | 'place' | 'confirm';

export default function CrewMeetupFormScreen(): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);
  const route = useRoute<RouteProp<RootStackParamList, 'MeetupForm'>>();

  return (
    <AuthHydrationGate
      hydrated={hydrated}
      accessToken={accessToken}
      loginTitleKey="crew.loginRequiredTitle"
      loginDescriptionKey="crew.loginRequiredDescription"
    >
      {(token) => (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <MeetupFormContent
            accessToken={token}
            meetupExtId={route.params?.meetupExtId}
            crewExtId={route.params?.crewExtId}
            crewName={route.params?.crewName}
            selectedGymExtId={route.params?.selectedGymExtId}
            selectedGymName={route.params?.selectedGymName}
          />
        </SafeAreaView>
      )}
    </AuthHydrationGate>
  );
}

function MeetupFormContent({
  accessToken,
  meetupExtId,
  crewExtId,
  crewName,
  selectedGymExtId,
  selectedGymName,
}: {
  accessToken: string;
  meetupExtId?: string;
  crewExtId?: string;
  crewName?: string;
  selectedGymExtId?: string;
  selectedGymName?: string;
}): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation<RootStackNavigationProp<'MeetupForm'>>();
  const createMeetup = useCreateMeetup(accessToken);
  const updateMeetup = useUpdateMeetup(accessToken);
  const meetupQuery = useMeetupQuery(accessToken, meetupExtId);
  const [step, setStep] = useState<Step>('basic');
  const [hydratedEditForm, setHydratedEditForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(addDays(new Date(), 1)));
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(addDays(new Date(), 1)));
  const [selectedHour, setSelectedHour] = useState(19);
  const [selectedMinute, setSelectedMinute] = useState(30);
  const [manualLocation, setManualLocation] = useState('');
  const [capacityText, setCapacityText] = useState('');
  const [joinPolicy, setJoinPolicy] = useState<'OPEN' | 'APPROVAL'>('OPEN');
  const [validation, setValidation] = useState<string | null>(null);

  const startsAt = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    selectedHour,
    selectedMinute,
    0,
    0,
  );
  const isEdit = Boolean(meetupExtId);
  const busy = createMeetup.isPending || updateMeetup.isPending || meetupQuery.isLoading;
  const error = validation
    ?? (createMeetup.error ? toUserMessage(createMeetup.error) : null)
    ?? (updateMeetup.error ? toUserMessage(updateMeetup.error) : null)
    ?? (meetupQuery.error ? toUserMessage(meetupQuery.error) : null);

  useEffect(() => {
    const meetup = meetupQuery.data;
    if (!meetup || hydratedEditForm) {
      return;
    }
    const start = new Date(meetup.startsAt);
    setTitle(meetup.title);
    setDescription(meetup.description ?? '');
    setSelectedDate(startOfDay(start));
    setVisibleMonth(startOfMonth(start));
    setSelectedHour(start.getHours());
    setSelectedMinute(start.getMinutes());
    setManualLocation(meetup.gymExtId ? '' : meetup.location ?? '');
    setCapacityText(meetup.capacity == null ? '' : String(meetup.capacity));
    setJoinPolicy(meetup.joinPolicy);
    setHydratedEditForm(true);
  }, [hydratedEditForm, meetupQuery.data]);

  const goNext = () => {
    if (step === 'basic') {
      if (title.trim().length < 2 || title.trim().length > 60) {
        setValidation(t('crew.meetup.titleValidation'));
        return;
      }
      setValidation(null);
      setStep('time');
      return;
    }
    if (step === 'time') {
      setStep('place');
      return;
    }
    if (step === 'place') {
      setStep('confirm');
    }
  };

  const submit = () => {
    const capacity = capacityText.trim().length > 0 ? Number(capacityText.trim()) : null;
    if (capacity !== null && (!Number.isInteger(capacity) || capacity < 2 || capacity > 200)) {
      setValidation(t('crew.form.capacityValidation'));
      return;
    }
    const body: CreateCrewMeetupBody = {
      title: title.trim(),
      description: toNullable(description),
      startsAt: startsAt.toISOString(),
      crewExtId: crewExtId ?? null,
      gymExtId: selectedGymExtId ?? null,
      location: selectedGymExtId ? null : toNullable(manualLocation),
      capacity,
      joinPolicy,
    };
    setValidation(null);
    if (meetupExtId) {
      updateMeetup.mutate({ extId: meetupExtId, body }, { onSuccess: () => navigation.goBack() });
      return;
    }
    createMeetup.mutate(body, { onSuccess: () => navigation.goBack() });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{isEdit ? t('crew.meetup.editTitle') : t('crew.meetup.formTitle')}</Text>
        <Text style={styles.subtitle}>{stepLabel(step, crewName)}</Text>
      </View>

      <StepIndicator step={step} />

      <View style={styles.card}>
        {step === 'basic' ? (
          <>
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
          </>
        ) : null}

        {step === 'time' ? (
          <>
            <CalendarPicker
              visibleMonth={visibleMonth}
              selectedDate={selectedDate}
              disabled={busy}
              onPrevious={() => setVisibleMonth(addMonths(visibleMonth, -1))}
              onNext={() => setVisibleMonth(addMonths(visibleMonth, 1))}
              onSelect={setSelectedDate}
            />
            <View style={styles.timeGrid}>
              {TIME_SLOTS.map((slot) => {
                const active = slot.hour === selectedHour && slot.minute === selectedMinute;
                return (
                  <Pressable
                    key={slot.label}
                    onPress={() => {
                      setSelectedHour(slot.hour);
                      setSelectedMinute(slot.minute);
                    }}
                    disabled={busy}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.timeChip,
                      active ? styles.timeChipActive : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text style={[styles.timeChipText, active ? styles.timeChipTextActive : null]}>
                      {slot.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.selectedDateText}>{formatSelectedDate(startsAt)}</Text>
          </>
        ) : null}

        {step === 'place' ? (
          <>
            <FieldLabel label={t('crew.meetup.locationLabel')} />
            <View style={styles.selectedGymBox}>
              <Text style={styles.selectedGymTitle}>
                {selectedGymName ?? t('crew.meetup.noGymSelected')}
              </Text>
              <SecondaryButton
                onPress={() => navigation.navigate('GymSearch', {
                  selectFor: 'MeetupForm',
                  meetupExtId,
                  crewExtId,
                  crewName,
                })}
                disabled={busy}
              >
                {t('crew.meetup.chooseGymCta')}
              </SecondaryButton>
            </View>
            <TextInput
              value={manualLocation}
              onChangeText={setManualLocation}
              placeholder={t('crew.meetup.locationPlaceholder')}
              placeholderTextColor={theme.text4}
              style={styles.input}
              maxLength={100}
              editable={!busy && !selectedGymExtId}
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
            <FieldLabel label={t('meetup.detail.joinPolicyLabel')} />
            <View style={styles.policyRow}>
              {(['OPEN', 'APPROVAL'] as const).map((policy) => {
                const active = joinPolicy === policy;
                return (
                  <Pressable
                    key={policy}
                    onPress={() => setJoinPolicy(policy)}
                    disabled={busy}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.policyChip,
                      active ? styles.policyChipActive : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text style={[styles.policyChipText, active ? styles.policyChipTextActive : null]}>
                      {t(`meetup.joinPolicy.${policy}` as MessageKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {step === 'confirm' ? (
          <View style={styles.confirmList}>
            <ConfirmRow label={t('crew.meetup.nameLabel')} value={title.trim()} />
            <ConfirmRow label={t('crew.meetup.startsAtLabel')} value={formatSelectedDate(startsAt)} />
            <ConfirmRow
              label={t('crew.meetup.locationLabel')}
              value={selectedGymName ?? toNullable(manualLocation) ?? t('crew.meetup.noGymSelected')}
            />
            <ConfirmRow
              label={t('meetup.detail.joinPolicyLabel')}
              value={t(`meetup.joinPolicy.${joinPolicy}` as MessageKey)}
            />
            {crewName ? <ConfirmRow label={t('crew.list.title')} value={crewName} /> : null}
          </View>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.actionRow}>
        {step !== 'basic' ? (
          <SecondaryButton onPress={() => setStep(previousStep(step))} disabled={busy}>
            {t('common.back')}
          </SecondaryButton>
        ) : null}
        <View style={styles.primaryAction}>
          <PrimaryButton onPress={step === 'confirm' ? submit : goNext} disabled={busy}>
            {busy
              ? t('crew.form.creating')
              : step === 'confirm'
                ? isEdit ? t('crew.meetup.updateCta') : t('crew.meetup.createCta')
                : t('common.next')}
          </PrimaryButton>
        </View>
      </View>
      {busy ? (
        <View style={styles.pendingRow}>
          <ActivityIndicator color={theme.accent.base} />
        </View>
      ) : null}
    </ScrollView>
  );
}

function StepIndicator({ step }: { step: Step }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const current = STEPS.indexOf(step);
  return (
    <View style={styles.stepRow}>
      {STEPS.map((item, index) => (
        <View key={item} style={[styles.stepDot, index <= current ? styles.stepDotActive : null]} />
      ))}
    </View>
  );
}

function FieldLabel({ label }: { label: string }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return <Text style={styles.label}>{label}</Text>;
}

function ConfirmRow({ label, value }: { label: string; value: string }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.confirmRow}>
      <Text style={styles.confirmLabel}>{label}</Text>
      <Text style={styles.confirmValue}>{value}</Text>
    </View>
  );
}

function CalendarPicker({
  visibleMonth,
  selectedDate,
  disabled,
  onPrevious,
  onNext,
  onSelect,
}: {
  visibleMonth: Date;
  selectedDate: Date;
  disabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSelect: (date: Date) => void;
}): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const days = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);

  return (
    <View style={styles.calendar}>
      <View style={styles.calendarHeader}>
        <Pressable onPress={onPrevious} disabled={disabled} style={styles.monthButton}>
          <Text style={styles.monthButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.calendarTitle}>{formatMonth(visibleMonth)}</Text>
        <Pressable onPress={onNext} disabled={disabled} style={styles.monthButton}>
          <Text style={styles.monthButtonText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {WEEKDAYS.map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}
      </View>
      <View style={styles.dayGrid}>
        {days.map((day, index) => {
          const active = isSameDay(day.date, selectedDate);
          return (
            <Pressable
              key={`${day.date.toISOString()}-${index}`}
              onPress={() => onSelect(startOfDay(day.date))}
              disabled={disabled}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.dayCell,
                !day.inMonth ? styles.dayCellMuted : null,
                active ? styles.dayCellActive : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={[
                styles.dayText,
                !day.inMonth ? styles.dayTextMuted : null,
                active ? styles.dayTextActive : null,
              ]}
              >
                {day.date.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const STEPS: Step[] = ['basic', 'time', 'place', 'confirm'];
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const TIME_SLOTS = [
  { label: '10:00', hour: 10, minute: 0 },
  { label: '13:00', hour: 13, minute: 0 },
  { label: '15:00', hour: 15, minute: 0 },
  { label: '17:00', hour: 17, minute: 0 },
  { label: '19:30', hour: 19, minute: 30 },
  { label: '21:00', hour: 21, minute: 0 },
] as const;

function previousStep(step: Step): Step {
  const index = Math.max(0, STEPS.indexOf(step) - 1);
  return STEPS[index] ?? 'basic';
}

function stepLabel(step: Step, crewName?: string): string {
  const prefix = crewName ? `${crewName} · ` : '';
  if (step === 'basic') {
    return `${prefix}${t('crew.meetup.stepBasic')}`;
  }
  if (step === 'time') {
    return `${prefix}${t('crew.meetup.stepTime')}`;
  }
  if (step === 'place') {
    return `${prefix}${t('crew.meetup.stepPlace')}`;
  }
  return `${prefix}${t('crew.meetup.stepConfirm')}`;
}

function calendarDays(month: Date): Array<{ date: Date; inMonth: boolean }> {
  const first = startOfMonth(month);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    return { date, inMonth: date.getMonth() === first.getMonth() };
  });
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(date);
}

function formatSelectedDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function toNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.bg },
    container: { flex: 1, backgroundColor: theme.bg },
    content: {
      paddingHorizontal: space[5],
      paddingTop: space[1],
      paddingBottom: space[10],
      gap: space[4],
    },
    titleBlock: { gap: space[1] },
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
    stepRow: { flexDirection: 'row', gap: space[2] },
    stepDot: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.hairline,
    },
    stepDotActive: { backgroundColor: theme.accent.base },
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
    textArea: { minHeight: 112, textAlignVertical: 'top' },
    calendar: {
      borderRadius: radius.lg,
      backgroundColor: theme.bg,
      padding: space[3],
      gap: space[2],
    },
    calendarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    monthButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      backgroundColor: theme.subtle,
    },
    monthButtonText: {
      fontFamily,
      fontSize: 24,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    calendarTitle: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    weekRow: { flexDirection: 'row' },
    weekday: {
      flex: 1,
      textAlign: 'center',
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      color: theme.text3,
    },
    dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
    },
    dayCellMuted: { opacity: 0.35 },
    dayCellActive: { backgroundColor: theme.accent.base },
    dayText: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    dayTextMuted: { color: theme.text4 },
    dayTextActive: { color: theme.accent.on },
    timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    timeChip: {
      minWidth: 74,
      borderRadius: radius.full,
      backgroundColor: theme.bg,
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      alignItems: 'center',
    },
    timeChipActive: { backgroundColor: theme.accent.base },
    timeChipText: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      color: theme.text2,
    },
    timeChipTextActive: { color: theme.accent.on },
    policyRow: { flexDirection: 'row', gap: space[2] },
    policyChip: {
      flex: 1,
      minHeight: 44,
      borderRadius: radius.lg,
      backgroundColor: theme.bg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space[3],
    },
    policyChipActive: { backgroundColor: theme.accent.base },
    policyChipText: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      color: theme.text2,
    },
    policyChipTextActive: { color: theme.accent.on },
    selectedDateText: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    selectedGymBox: {
      borderRadius: radius.lg,
      backgroundColor: theme.bg,
      padding: space[3],
      gap: space[2],
    },
    selectedGymTitle: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    confirmList: { gap: space[3] },
    confirmRow: { gap: space[1] },
    confirmLabel: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      color: theme.text3,
    },
    confirmValue: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
    },
    primaryAction: { flex: 1 },
    pressed: { opacity: 0.75 },
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
