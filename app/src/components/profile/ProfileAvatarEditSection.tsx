import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type CameraOptions,
  type ImageLibraryOptions,
} from 'react-native-image-picker';
import RNFS from 'react-native-fs';

import { SecondaryButton } from '@/components/common/primitives';
import { ProfileAvatarSourceModal } from '@/components/profile/ProfileAvatarSourceModal';
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

const LIBRARY_PICKER_OPTIONS: ImageLibraryOptions = {
  mediaType: 'photo',
  selectionLimit: 1,
  quality: 0.9,
  includeBase64: true,
};

const CAMERA_PICKER_OPTIONS: CameraOptions = {
  mediaType: 'photo',
  quality: 0.9,
  includeBase64: true,
  saveToPhotos: false,
};

type AvatarSource = 'camera' | 'library';

type Props = {
  accessToken: string;
  avatarUrl?: string | null;
  nickname: string;
  disabled: boolean;
  onAvatarUploaded: (mediaId: number) => Promise<void>;
  onAvatarCleared: () => Promise<void>;
  onError: (error: unknown | string) => void;
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
  const [sourceModalVisible, setSourceModalVisible] = useState(false);
  const pendingSourceRef = useRef<AvatarSource | null>(null);
  const busy = phase !== null;
  const blocked = disabled || busy;

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  const onChoose = async () => {
    if (blocked) {
      logAvatarEvent('source-open-blocked', {
        disabled,
        busy,
        phase,
      });
      return;
    }
    logAvatarEvent('source-open', {
      hasAvatarUrl: Boolean(avatarUrl),
    });
    setSourceModalVisible(true);
  };

  const onChooseSource = async (source: AvatarSource) => {
    if (blocked) {
      logAvatarEvent('source-select-blocked', {
        source,
        disabled,
        busy,
        phase,
      });
      return;
    }
    logAvatarEvent('source-select', { source });
    pendingSourceRef.current = source;
    setSourceModalVisible(false);
  };

  const onSourceModalDismissed = () => {
    const source = pendingSourceRef.current;
    pendingSourceRef.current = null;
    logAvatarEvent('source-modal-dismissed', {
      hasPendingSource: Boolean(source),
      source: source ?? null,
    });
    if (source) {
      void chooseSourceAfterModalDismiss(source);
    }
  };

  const chooseSourceAfterModalDismiss = async (source: AvatarSource) => {
    try {
      logAvatarEvent('picker-slot-wait-start', { source });
      await waitForNativePickerSlot();
      logAvatarEvent('picker-launch', { source });
      const selected = await pickImageWithFallback(source);
      if (selected === null) {
        logAvatarEvent('picker-cancelled', { source });
        return;
      }
      logAvatarEvent('picker-selected', summarizeAsset(selected));
      const captured = await assetToCapturedMedia(selected).catch((err) => {
        logAvatarError('asset-prepare', err, summarizeAsset(selected));
        throw err;
      });
      const uploaded = await uploadAvatarImage(accessToken, captured, {
        onPhase: setPhase,
      }).catch((err) => {
        logAvatarError('upload', err, summarizeCapturedMedia(captured));
        throw err;
      });
      logAvatarEvent('uploaded', {
        mediaId: uploaded.id,
        hasCdnUrl: Boolean(uploaded.cdnUrl),
        s3Key: uploaded.s3Key,
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

  const pickImageWithFallback = async (source: AvatarSource): Promise<Asset | null> => {
    try {
      return await pickImage(source);
    } catch (err) {
      logAvatarError('picker', err, { source });
      if (source === 'camera' && isCameraUnavailableError(err)) {
        logAvatarEvent('camera-fallback-library', { reason: describePickerError(err) });
        try {
          return await pickImage('library');
        } catch (libraryErr) {
          logAvatarError('picker-fallback-library', libraryErr, { source: 'library' });
          throw libraryErr;
        }
      }
      throw err;
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
      <ProfileAvatarSourceModal
        visible={sourceModalVisible}
        disabled={blocked}
        onCamera={() => void onChooseSource('camera')}
        onLibrary={() => void onChooseSource('library')}
        onCancel={() => setSourceModalVisible(false)}
        onDismissed={onSourceModalDismissed}
      />
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

async function pickImage(source: AvatarSource): Promise<Asset | null> {
  const result =
    source === 'camera'
      ? await launchCamera(CAMERA_PICKER_OPTIONS)
      : await launchImageLibrary(LIBRARY_PICKER_OPTIONS);
  if (result.didCancel) {
    return null;
  }
  if (result.errorCode) {
    throw new AvatarPickerError(result.errorCode, result.errorMessage);
  }
  const asset = result.assets?.[0];
  if (!asset?.uri) {
    throw new Error('No image selected');
  }
  return asset;
}

class AvatarPickerError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'AvatarPickerError';
    this.code = code;
  }
}

function isCameraUnavailableError(error: unknown): boolean {
  if (error instanceof AvatarPickerError) {
    return error.code === 'camera_unavailable';
  }
  return error instanceof Error && error.message === 'camera_unavailable';
}

function describePickerError(error: unknown): string {
  if (error instanceof AvatarPickerError) {
    return error.code;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function waitForNativePickerSlot(): Promise<void> {
  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 120);
  });
}

function logAvatarEvent(event: string, context: Record<string, unknown>): void {
  console.warn('[profile/avatar/trace]', {
    event,
    ...context,
  });
}

function logAvatarError(
  stage: string,
  error: unknown,
  context: Record<string, unknown> = {},
): void {
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
  if (detectedMime === null) {
    const meta = await readImageMeta(uri);
    byteSize = byteSize ?? meta.byteSize;
    detectedMime = detectedMime ?? meta.mime;
  }
  uri = await persistPickerImage(asset, detectedMime ?? 'image/jpeg');
  if (asset.base64) {
    byteSize = byteSize ?? measureBase64Bytes(asset.base64);
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

async function persistPickerImage(
  asset: Asset,
  mime: DetectedImageMime,
): Promise<string> {
  const extension = imageExtension(mime);
  const path = `${RNFS.CachesDirectoryPath}/profile-avatar-${Date.now()}.${extension}`;
  if (asset.base64) {
    await RNFS.writeFile(path, asset.base64, 'base64');
  } else if (asset.uri) {
    await RNFS.copyFile(stripFileScheme(asset.uri), path);
  } else {
    throw new Error('Image uri is missing');
  }
  return `file://${path}`;
}

function stripFileScheme(uri: string): string {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
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
