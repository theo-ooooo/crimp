import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  launchImageLibrary,
  type Asset,
  type ImageLibraryOptions,
} from 'react-native-image-picker';
import RNFS from 'react-native-fs';

import { SecondaryButton } from '@/components/common/primitives';
import type { CapturedMedia } from '@/lib/camera/types';
import { readImageMeta, type DetectedImageMime } from '@/lib/camera/measure';
import { t } from '@/lib/i18n';
import { uploadAvatarImage, type UploadPhase } from '@/lib/media/upload';
import {
  fontFamily,
  fontSize,
  fontWeight,
  radius,
  space,
  withAlpha,
  type Theme,
} from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';

const PICKER_OPTIONS: ImageLibraryOptions = {
  mediaType: 'photo',
  selectionLimit: 1,
  quality: 0.9,
  includeBase64: true,
};

type Props = {
  accessToken: string;
  avatarUrl?: string | null;
  nickname: string;
  disabled: boolean;
  onAvatarUploaded: (mediaId: number) => Promise<void>;
  onAvatarCleared: () => Promise<void>;
  onError: (error: unknown) => void;
};

export function ProfileAvatarEditSection({
  accessToken,
  avatarUrl,
  nickname,
  disabled,
  onAvatarUploaded,
  onAvatarCleared,
  onError,
}: Props): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const initial = nickname.trim().slice(0, 1) || '?';
  const [phase, setPhase] = useState<UploadPhase | 'saving' | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const busy = phase !== null;
  const blocked = disabled || busy;

  const onChoose = async () => {
    if (blocked) {
      return;
    }
    try {
      const selected = await pickImage().catch((err) => {
        logAvatarError('picker', err);
        throw err;
      });
      if (selected === null) {
        return;
      }
      const captured = await assetToCapturedMedia(selected).catch((err) => {
        logAvatarError('asset-meta', err, summarizeAsset(selected));
        throw err;
      });
      const uploaded = await uploadAvatarImage(accessToken, captured, {
        onPhase: setPhase,
      }).catch((err) => {
        logAvatarError('upload', err, summarizeCapturedMedia(captured));
        throw err;
      });
      setPhase('saving');
      await onAvatarUploaded(uploaded.id).catch((err) => {
        logAvatarError('profile-save', err, { mediaId: uploaded.id });
        throw err;
      });
      setImageFailed(false);
    } catch (err) {
      onError(err);
    } finally {
      setPhase(null);
    }
  };

  const onClear = async () => {
    if (blocked || !avatarUrl) {
      return;
    }
    try {
      setPhase('saving');
      await onAvatarCleared().catch((err) => {
        logAvatarError('profile-clear', err);
        throw err;
      });
      setImageFailed(false);
    } catch (err) {
      onError(err);
    } finally {
      setPhase(null);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          {avatarUrl && !imageFailed ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              accessibilityLabel={nickname}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
          {busy ? (
            <View style={styles.busyOverlay}>
              <ActivityIndicator color={theme.accent.on} />
            </View>
          ) : null}
        </View>
        <View style={styles.copy}>
          <Text style={styles.label}>{t('profile.edit.avatarLabel')}</Text>
          <Text style={styles.help}>{phaseLabel(phase)}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={onChoose}
          disabled={blocked}
          accessibilityRole="button"
          accessibilityLabel={t('profile.edit.avatarChoose')}
          style={({ pressed }) => [
            styles.primaryAction,
            pressed ? styles.pressed : null,
            blocked ? styles.disabled : null,
          ]}
        >
          <Text style={styles.primaryActionText}>
            {t('profile.edit.avatarChoose')}
          </Text>
        </Pressable>
        {avatarUrl ? (
          <View style={styles.clearAction}>
            <SecondaryButton onPress={onClear} disabled={blocked}>
              {t('profile.edit.avatarClear')}
            </SecondaryButton>
          </View>
        ) : null}
      </View>
    </View>
  );
}

async function pickImage(): Promise<Asset | null> {
  const result = await launchImageLibrary(PICKER_OPTIONS);
  if (result.didCancel) {
    return null;
  }
  if (result.errorCode) {
    throw new Error(result.errorMessage ?? result.errorCode);
  }
  const asset = result.assets?.[0];
  if (!asset?.uri) {
    throw new Error('No image selected');
  }
  return asset;
}

function logAvatarError(
  stage: string,
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  if (!__DEV__) {
    return;
  }
  const errorInfo =
    error instanceof Error
      ? { name: error.name, message: error.message }
      : { name: typeof error, message: String(error) };
  console.warn('[profile/avatar] failed', {
    stage,
    ...errorInfo,
    ...context,
  });
}

function summarizeAsset(asset: Asset): Record<string, unknown> {
  return {
    type: asset.type ?? null,
    hasUri: Boolean(asset.uri),
    uriScheme: uriScheme(asset.uri),
    fileSize: asset.fileSize ?? null,
    width: asset.width ?? null,
    height: asset.height ?? null,
  };
}

function summarizeCapturedMedia(media: CapturedMedia): Record<string, unknown> {
  return {
    kind: media.kind,
    mime: media.mime,
    byteSize: media.byteSize,
    width: media.width,
    height: media.height,
    uriScheme: uriScheme(media.uri),
  };
}

function uriScheme(uri: string | undefined): string | null {
  const match = uri?.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  return match?.[1] ?? null;
}

async function assetToCapturedMedia(asset: Asset): Promise<CapturedMedia> {
  if (!asset.uri) {
    throw new Error('Image uri is missing');
  }
  let byteSize = typeof asset.fileSize === 'number' && asset.fileSize > 0
    ? asset.fileSize
    : null;
  let detectedMime: DetectedImageMime | null = normalizeImageMime(asset.type);
  let uri = asset.uri;
  if (asset.base64 && detectedMime !== null) {
    uri = await persistBase64Image(asset.base64, detectedMime);
    byteSize = byteSize ?? measureBase64Bytes(asset.base64);
  }
  if (detectedMime === null) {
    const meta = await readImageMeta(uri);
    byteSize = byteSize ?? meta.byteSize;
    detectedMime = detectedMime ?? meta.mime;
  }
  return {
    uri,
    mime: detectedMime ?? 'image/jpeg',
    byteSize: byteSize ?? 1,
    width: positiveDimension(asset.width),
    height: positiveDimension(asset.height),
    durationMs: null,
    kind: 'IMAGE',
  };
}

async function persistBase64Image(
  base64: string,
  mime: DetectedImageMime,
): Promise<string> {
  const extension = imageExtension(mime);
  const path = `${RNFS.CachesDirectoryPath}/profile-avatar-${Date.now()}.${extension}`;
  await RNFS.writeFile(path, base64, 'base64');
  return `file://${path}`;
}

function measureBase64Bytes(base64: string): number {
  const normalized = base64.trim();
  let padding = 0;
  if (normalized.endsWith('==')) {
    padding = 2;
  } else if (normalized.endsWith('=')) {
    padding = 1;
  }
  return Math.max(1, Math.floor((normalized.length * 3) / 4) - padding);
}

function imageExtension(mime: DetectedImageMime): string {
  if (mime === 'image/png') {
    return 'png';
  }
  if (mime === 'image/webp') {
    return 'webp';
  }
  if (mime === 'image/heic') {
    return 'heic';
  }
  return 'jpg';
}

function normalizeImageMime(mime: string | undefined): DetectedImageMime | null {
  if (
    mime === 'image/jpeg' ||
    mime === 'image/jpg' ||
    mime === 'image/png' ||
    mime === 'image/heic' ||
    mime === 'image/webp'
  ) {
    return mime === 'image/jpg' ? 'image/jpeg' : mime;
  }
  return null;
}

function positiveDimension(value: number | undefined): number | null {
  return typeof value === 'number' && value > 0 ? value : null;
}

function phaseLabel(phase: UploadPhase | 'saving' | null): string {
  if (phase === 'compressing') {
    return t('profile.edit.avatarCompressing');
  }
  if (phase === 'uploading') {
    return t('profile.edit.avatarUploading');
  }
  if (phase === 'saving') {
    return t('profile.edit.avatarSaving');
  }
  return t('profile.edit.avatarHelp');
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      borderRadius: radius.lg,
      backgroundColor: theme.subtle2,
      padding: space[4],
      gap: space[4],
    },
    avatarWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[4],
    },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: theme.accent.base,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarText: {
      fontFamily,
      fontSize: 30,
      fontWeight: fontWeight.extrabold,
      color: theme.accent.on,
      includeFontPadding: false,
    },
    busyOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(theme.text, 0.34),
    },
    copy: {
      flex: 1,
      gap: space[1],
      minWidth: 0,
    },
    label: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    help: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.medium,
      color: theme.text3,
    },
    actions: {
      flexDirection: 'row',
      gap: space[2],
    },
    primaryAction: {
      flex: 1,
      minHeight: 48,
      borderRadius: radius.lg,
      backgroundColor: theme.accent.base,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space[4],
    },
    primaryActionText: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.accent.on,
    },
    clearAction: {
      flex: 1,
    },
    pressed: {
      opacity: 0.85,
    },
    disabled: {
      opacity: 0.5,
    },
  });
}
