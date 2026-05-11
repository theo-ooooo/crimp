import { useNavigation } from '@react-navigation/native';
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

import { Chip, PrimaryButton } from '@/components/common/primitives';
import { AuthHydrationGate } from '@/components/common/screen/AuthHydrationGate';
import { useCreateCrew } from '@/hooks/queries/useCrews';
import {
  CREW_LEVEL_OPTIONS,
  CREW_REGION_OPTIONS,
  CREW_STYLE_OPTIONS,
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
import type { CreateCrewBody, CrewLevelBand, CrewStyle } from '@/lib/schemas/crew';
import type { RootStackNavigationProp } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

export default function CrewFormScreen(): JSX.Element {
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
          <CrewFormContent accessToken={token} />
        </SafeAreaView>
      )}
    </AuthHydrationGate>
  );
}

function CrewFormContent({ accessToken }: { accessToken: string }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation<RootStackNavigationProp<'CrewForm'>>();
  const createCrew = useCreateCrew(accessToken);
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState('');
  const [capacityText, setCapacityText] = useState('');
  const [levelBand, setLevelBand] = useState<CrewLevelBand>('ALL');
  const [style, setStyle] = useState<CrewStyle>('BOTH');
  const [validation, setValidation] = useState<string | null>(null);

  const submit = () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 30) {
      setValidation(t('crew.form.nameValidation'));
      return;
    }

    const capacity = capacityText.trim().length > 0
      ? Number(capacityText.trim())
      : null;
    if (
      capacity !== null
      && (!Number.isInteger(capacity) || capacity < 2 || capacity > 200)
    ) {
      setValidation(t('crew.form.capacityValidation'));
      return;
    }

    setValidation(null);
    const body: CreateCrewBody = {
      name: trimmedName,
      summary: toNullable(summary),
      description: toNullable(description),
      region: toNullable(region),
      levelBand,
      style,
      capacity,
    };

    createCrew.mutate(body, {
      onSuccess: (created) => {
        navigation.replace('CrewDetail', { extId: created.extId });
      },
    });
  };

  const busy = createCrew.isPending;
  const error = validation ?? (createCrew.error ? toUserMessage(createCrew.error) : null);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{t('crew.form.title')}</Text>
        <Text style={styles.subtitle}>{t('crew.form.subtitle')}</Text>
      </View>

      <View style={styles.card}>
        <FieldLabel label={t('crew.form.nameLabel')} />
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('crew.form.namePlaceholder')}
          placeholderTextColor={theme.text4}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={30}
          editable={!busy}
        />

        <FieldLabel label={t('crew.form.summaryLabel')} />
        <TextInput
          value={summary}
          onChangeText={setSummary}
          placeholder={t('crew.form.summaryPlaceholder')}
          placeholderTextColor={theme.text4}
          style={styles.input}
          maxLength={120}
          editable={!busy}
        />

        <FieldLabel label={t('crew.form.descriptionLabel')} />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t('crew.form.descriptionPlaceholder')}
          placeholderTextColor={theme.text4}
          style={[styles.input, styles.textArea]}
          multiline
          maxLength={500}
          editable={!busy}
        />

        <FieldLabel label={t('crew.form.regionLabel')} />
        <OptionRow
          options={CREW_REGION_OPTIONS.filter((opt) => opt.key.length > 0)}
          active={region}
          onSelect={(next) => setRegion(region === next ? '' : next)}
        />

        <FieldLabel label={t('crew.form.levelLabel')} />
        <OptionRow
          options={CREW_LEVEL_OPTIONS}
          active={levelBand}
          onSelect={(next) => setLevelBand(next as CrewLevelBand)}
        />

        <FieldLabel label={t('crew.form.styleLabel')} />
        <OptionRow
          options={CREW_STYLE_OPTIONS}
          active={style}
          onSelect={(next) => setStyle(next as CrewStyle)}
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
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <PrimaryButton onPress={submit} disabled={busy}>
        {busy ? t('crew.form.creating') : t('crew.form.createCta')}
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

function OptionRow<T extends string>({
  options,
  active,
  onSelect,
}: {
  options: Array<{ key: T; labelKey: string }>;
  active: string;
  onSelect: (next: T) => void;
}): JSX.Element {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={optionStyles.row}
    >
      {options.map((opt) => (
        <Chip
          key={opt.key}
          label={t(opt.labelKey as MessageKey)}
          active={active === opt.key}
          onPress={() => onSelect(opt.key)}
        />
      ))}
    </ScrollView>
  );
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

const optionStyles = StyleSheet.create({
  row: {
    gap: space[2],
    paddingRight: space[5],
  },
});
