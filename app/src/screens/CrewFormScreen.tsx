import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip, PrimaryButton } from '@/components/common/primitives';
import { AuthHydrationGate } from '@/components/common/screen/AuthHydrationGate';
import { useCreateCrew } from '@/hooks/queries/useCrews';
import type { CapturedMedia } from '@/lib/camera/types';
import { readImageMeta, type DetectedImageMime } from '@/lib/camera/measure';
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
import { uploadCrewImage, type UploadPhase } from '@/lib/media/upload';
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
  const [imageMediaId, setImageMediaId] = useState<number | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase | null>(null);
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
      imageMediaId,
    };

    createCrew.mutate(body, {
      onSuccess: (created) => {
        navigation.replace('CrewDetail', { extId: created.extId });
      },
    });
  };

  const busy = createCrew.isPending || uploadPhase !== null;
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
        <CrewImagePicker
          accessToken={accessToken}
          previewUrl={imagePreviewUrl}
          disabled={busy}
          phase={uploadPhase}
          onPhase={setUploadPhase}
          onUploaded={(mediaId, url) => {
            setImageMediaId(mediaId);
            setImagePreviewUrl(url);
            setValidation(null);
          }}
          onError={(err) => setValidation(toUserMessage(err))}
        />

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

function CrewImagePicker({
  accessToken,
  previewUrl,
  disabled,
  phase,
  onPhase,
  onUploaded,
  onError,
}: {
  accessToken: string;
  previewUrl: string | null;
  disabled: boolean;
  phase: UploadPhase | null;
  onPhase: (phase: UploadPhase | null) => void;
  onUploaded: (mediaId: number, url: string | null) => void;
  onError: (error: unknown) => void;
}): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const chooseImage = async () => {
    if (disabled) {
      return;
    }
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.9,
        includeBase64: true,
      });
      if (result.didCancel) {
        return;
      }
      if (result.errorCode) {
        throw new Error(result.errorMessage ?? result.errorCode);
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        throw new Error('No image selected');
      }
      const captured = await assetToCapturedMedia(asset);
      const uploaded = await uploadCrewImage(accessToken, captured, {
        onPhase: onPhase as (phase: UploadPhase) => void,
      });
      onUploaded(uploaded.id, uploaded.cdnUrl ?? uploaded.variantUrl ?? captured.uri);
    } catch (err) {
      onError(err);
    } finally {
      onPhase(null);
    }
  };

  return (
    <View style={styles.imageBlock}>
      <Pressable
        onPress={chooseImage}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={t('crew.form.imageChoose')}
        style={({ pressed }) => [
          styles.imagePicker,
          pressed ? styles.cardPressed : null,
          disabled ? styles.disabled : null,
        ]}
      >
        {previewUrl ? (
          <Image source={{ uri: previewUrl }} style={styles.imagePreview} />
        ) : (
          <Text style={styles.imagePlaceholder}>{t('crew.form.imagePlaceholder')}</Text>
        )}
        {phase ? (
          <View style={styles.imageOverlay}>
            <ActivityIndicator color={theme.accent.on} />
          </View>
        ) : null}
      </Pressable>
      <View style={styles.imageCopy}>
        <Text style={styles.label}>{t('crew.form.imageLabel')}</Text>
        <Text style={styles.help}>{phase ? t('crew.form.imageUploading') : t('crew.form.imageHelp')}</Text>
      </View>
    </View>
  );
}

async function assetToCapturedMedia(asset: Asset): Promise<CapturedMedia> {
  if (!asset.uri) {
    throw new Error('Image uri is missing');
  }
  let byteSize = typeof asset.fileSize === 'number' && asset.fileSize > 0 ? asset.fileSize : null;
  let detectedMime: DetectedImageMime | null = normalizeImageMime(asset.type);
  if (detectedMime === null) {
    const meta = await readImageMeta(asset.uri);
    byteSize = byteSize ?? meta.byteSize;
    detectedMime = meta.mime;
  }
  const uri = await persistPickerImage(asset, detectedMime ?? 'image/jpeg');
  if (asset.base64) {
    byteSize = byteSize ?? measureBase64Bytes(asset.base64);
  }
  return {
    uri,
    mime: detectedMime ?? 'image/jpeg',
    byteSize: byteSize ?? 1,
    width: typeof asset.width === 'number' && asset.width > 0 ? asset.width : null,
    height: typeof asset.height === 'number' && asset.height > 0 ? asset.height : null,
    durationMs: null,
    kind: 'IMAGE',
  };
}

async function persistPickerImage(asset: Asset, mime: DetectedImageMime): Promise<string> {
  const extension = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : mime === 'image/heic' ? 'heic' : 'jpg';
  const path = `${RNFS.CachesDirectoryPath}/crew-image-${Date.now()}.${extension}`;
  if (asset.base64) {
    await RNFS.writeFile(path, asset.base64, 'base64');
  } else if (asset.uri) {
    await RNFS.copyFile(asset.uri.startsWith('file://') ? asset.uri.slice('file://'.length) : asset.uri, path);
  } else {
    throw new Error('Image uri is missing');
  }
  return `file://${path}`;
}

function normalizeImageMime(mime: string | undefined): DetectedImageMime | null {
  if (mime === 'image/jpeg' || mime === 'image/jpg' || mime === 'image/png' || mime === 'image/heic' || mime === 'image/webp') {
    return mime === 'image/jpg' ? 'image/jpeg' : mime;
  }
  return null;
}

function measureBase64Bytes(base64: string): number {
  const normalized = base64.trim();
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.max(1, Math.floor((normalized.length * 3) / 4) - padding);
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
    imageBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      marginBottom: space[1],
    },
    imagePicker: {
      width: 86,
      height: 86,
      borderRadius: radius.lg,
      backgroundColor: theme.accent.soft,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      flexShrink: 0,
    },
    imagePreview: {
      width: '100%',
      height: '100%',
    },
    imagePlaceholder: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      color: theme.text3,
      textAlign: 'center',
      paddingHorizontal: space[2],
    },
    imageOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.36)',
    },
    imageCopy: {
      flex: 1,
      gap: space[1],
    },
    help: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.medium,
      color: theme.text3,
      lineHeight: 17,
    },
    disabled: {
      opacity: 0.55,
    },
    cardPressed: {
      opacity: 0.85,
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
