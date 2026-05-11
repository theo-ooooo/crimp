import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Video from 'react-native-video';

import type { CapturedMedia } from '@/lib/camera/types';
import { t } from '@/lib/i18n';

import type { CameraSheetStyles } from './CameraSheet';

type CapturePreviewStyles = Pick<
  CameraSheetStyles,
  | 'previewMediaWrap'
  | 'previewMedia'
  | 'previewVideoBox'
  | 'previewVideoMeta'
  | 'previewActions'
  | 'previewTitle'
  | 'previewButtonRow'
  | 'previewBtn'
  | 'previewBtnGhost'
  | 'previewBtnPrimary'
  | 'previewBtnDisabled'
  | 'previewBtnGhostLabel'
  | 'previewBtnPrimaryLabel'
>;

type Props = {
  media: CapturedMedia;
  styles: CapturePreviewStyles;
  savingAlbum: boolean;
  onRetake: () => void;
  onConfirm: () => void;
};

export function CapturePreview({
  media,
  styles,
  savingAlbum,
  onRetake,
  onConfirm,
}: Props): JSX.Element {
  const isImage = media.kind === 'IMAGE';
  const mediaA11y = isImage
    ? t('session.log.capturePreviewPhotoA11y')
    : t('session.log.capturePreviewVideoA11y');

  return (
    <>
      <View
        style={styles.previewMediaWrap}
        accessibilityRole={isImage ? 'image' : undefined}
        accessibilityLabel={mediaA11y}
      >
        {isImage ? (
          <Image
            source={{ uri: media.uri }}
            style={styles.previewMedia}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.previewVideoBox}>
            <Video
              source={{ uri: media.uri }}
              style={styles.previewMedia}
              resizeMode="contain"
              controls
              repeat
              paused={false}
              muted={false}
            />
            <Text style={styles.previewVideoMeta}>{formatVideoMeta(media)}</Text>
          </View>
        )}
      </View>

      <View style={styles.previewActions}>
        <Text style={styles.previewTitle} accessibilityRole="header">
          {t('session.log.capturePreviewTitle')}
        </Text>
        <View style={styles.previewButtonRow}>
          <Pressable
            onPress={onRetake}
            disabled={savingAlbum}
            style={[
              styles.previewBtn,
              styles.previewBtnGhost,
              savingAlbum && styles.previewBtnDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('session.log.capturePreviewRetake')}
            accessibilityState={{ disabled: savingAlbum }}
          >
            <Text style={styles.previewBtnGhostLabel}>
              {t('session.log.capturePreviewRetake')}
            </Text>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            disabled={savingAlbum}
            style={[
              styles.previewBtn,
              styles.previewBtnPrimary,
              savingAlbum && styles.previewBtnDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              savingAlbum
                ? t('session.log.capturePreviewSaving')
                : t('session.log.capturePreviewConfirm')
            }
            accessibilityState={{ busy: savingAlbum, disabled: savingAlbum }}
          >
            <Text style={styles.previewBtnPrimaryLabel}>
              {savingAlbum
                ? t('session.log.capturePreviewSaving')
                : t('session.log.capturePreviewConfirm')}
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

function formatVideoMeta(media: CapturedMedia): string {
  const seconds = media.durationMs ? Math.round(media.durationMs / 1000) : 0;
  const mb = (media.byteSize / (1024 * 1024)).toFixed(1);
  return t('session.log.capturePreviewVideoMeta')
    .replace('{{seconds}}', String(seconds))
    .replace('{{mb}}', mb);
}
