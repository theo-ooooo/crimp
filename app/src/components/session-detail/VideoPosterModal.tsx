import Slider from '@react-native-community/slider';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { createThumbnail } from 'react-native-create-thumbnail';
import Video from 'react-native-video';

import { PrimaryButton, SecondaryButton } from '@/components/common/primitives';
import type { CapturedMedia } from '@/lib/camera/types';
import { t } from '@/lib/i18n';
import type { Theme } from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';

function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

type Props = {
  visible: boolean;
  video: CapturedMedia | null;
  onRequestUpload: (poster: CapturedMedia | null) => void;
};

/**
 * 동영상 업로드 전 대표 화면(프레임) 선택 — 스킵 시 null 로 업로드만 진행.
 */
export function VideoPosterModal({ visible, video, onRequestUpload }: Props): JSX.Element | null {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const videoRef = useRef<React.ComponentRef<typeof Video>>(null);
  const [durationMs, setDurationMs] = useState(2000);
  const [seekMs, setSeekMs] = useState(0);
  const [busy, setBusy] = useState(false);

  const videoUri = video ? toFileUri(video.uri) : '';

  const handleLoad = useCallback((data: { duration: number }) => {
    const d = Math.max(500, Math.round(data.duration * 1000));
    setDurationMs(d);
    setSeekMs(0);
  }, []);

  const onSliderChange = useCallback((v: number) => {
    setSeekMs(v);
    videoRef.current?.seek(v / 1000);
  }, []);

  const confirmPoster = useCallback(async () => {
    if (!video) {
      return;
    }
    setBusy(true);
    try {
      const thumb = await createThumbnail({
        url: toFileUri(video.uri),
        timeStamp: Math.min(Math.max(0, seekMs), Math.max(0, durationMs - 50)),
        format: 'jpeg',
        maxWidth: 720,
        maxHeight: 720,
      });
      const size = thumb.size ?? 0;
      if (size <= 0) {
        throw new Error('empty thumbnail');
      }
      const poster: CapturedMedia = {
        uri: toFileUri(thumb.path),
        mime: 'image/jpeg',
        byteSize: size,
        width: thumb.width ?? null,
        height: thumb.height ?? null,
        durationMs: null,
        kind: 'IMAGE',
      };
      onRequestUpload(poster);
    } catch {
      Alert.alert(t('session.log.posterErrorTitle'), t('session.log.posterErrorBody'));
    } finally {
      setBusy(false);
    }
  }, [video, seekMs, durationMs, onRequestUpload]);

  const skip = useCallback(() => {
    onRequestUpload(null);
  }, [onRequestUpload]);

  if (!visible || !video) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={skip}>
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
          {t('session.log.posterTitle')}
        </Text>
        <Text style={[styles.hint, { color: theme.text3 }]}>{t('session.log.posterHint')}</Text>

        <View style={[styles.videoWrap, { backgroundColor: theme.hairline }]}>
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={styles.video}
            resizeMode="contain"
            paused
            onLoad={handleLoad}
          />
        </View>

        <Text style={[styles.timeLabel, { color: theme.text3 }]}>
          {formatMs(seekMs)} / {formatMs(durationMs)}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={durationMs}
          value={seekMs}
          onValueChange={onSliderChange}
          minimumTrackTintColor={theme.accent.base}
          maximumTrackTintColor={theme.hairline}
          thumbTintColor={theme.accent.base}
          accessibilityLabel={t('session.log.posterSeekA11y')}
        />

        <View style={styles.actions}>
          <SecondaryButton onPress={skip} disabled={busy} accessibilityLabel={t('session.log.posterSkip')}>
            {t('session.log.posterSkip')}
          </SecondaryButton>
          <PrimaryButton
            onPress={() => {
              confirmPoster().catch(() => {});
            }}
            disabled={busy}
            accessibilityLabel={t('session.log.posterUseFrame')}
          >
            {busy ? t('session.log.posterWorking') : t('session.log.posterUseFrame')}
          </PrimaryButton>
        </View>

        <Pressable onPress={skip} style={styles.cancelBtn} accessibilityRole="button">
          <Text style={[styles.cancelLabel, { color: theme.text3 }]}>{t('common.cancel')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function makeStyles(_theme: Theme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 32,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 8,
    },
    hint: {
      fontSize: 14,
      marginBottom: 16,
      lineHeight: 20,
    },
    videoWrap: {
      width: '100%',
      aspectRatio: 4 / 5,
      borderRadius: 12,
      overflow: 'hidden',
    },
    video: {
      width: '100%',
      height: '100%',
    },
    timeLabel: {
      marginTop: 12,
      fontSize: 13,
    },
    slider: {
      width: '100%',
      height: 44,
    },
    actions: {
      marginTop: 24,
      gap: 12,
    },
    cancelBtn: {
      marginTop: 16,
      alignSelf: 'center',
      padding: 8,
    },
    cancelLabel: {
      fontSize: 15,
    },
  });
}
