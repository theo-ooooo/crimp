import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
  type CameraCaptureError,
} from 'react-native-vision-camera';

import { CrimpIcon } from '@/components/primitives';
import { measureFileBytes } from '@/lib/camera/measure';
import type { CapturedMedia } from '@/lib/camera/types';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontWeight,
  radius,
  space,
  withAlpha,
  type Theme,
} from '@/lib/tokens';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTokens } from '@/lib/useTokens';

import type { CameraMode } from './LogAttemptSheet';

/**
 * 카메라 시트 — 실 캡처 (PR #91, F5).
 *
 * vision-camera 5.x 기반. 권한 처리 → preview → photo/video 캡처 → 파일 메타 측정 →
 * 부모에게 {@link CapturedMedia} 전달. 후속 PR-3 가 본 객체를 받아 S3 업로드 흐름 진행.
 *
 * 색 정책: 시스템 카메라 앱과 동일하게 검은 배경 + 흰 오버레이 — 라이트/다크 무관.
 */

export type CameraSheetProps = {
  visible: boolean;
  mode: CameraMode;
  onClose: () => void;
  /**
   * 캡처 완료 콜백. 부모(SessionDetailScreen)는 이 값으로 다음 단계(현 단계: Alert /
   * 후속 PR-3: presigned 업로드 + LogAttemptSheet 의 mediaId 연결) 를 진행.
   */
  onCaptured: (media: CapturedMedia) => void;
};

const CAMERA_BG = '#000000';
const CAMERA_FG = '#FFFFFF';

export function CameraSheet({
  visible,
  mode,
  onClose,
  onCaptured,
}: CameraSheetProps): JSX.Element {
  const theme = useTokens();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const cameraPerm = useCameraPermission();
  const micPerm = useMicrophonePermission();

  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  // 영상 모드인데 mic 권한이 없으면 사운드 없이 녹화 — 권한 요청은 시트 진입 시 한 번 시도.
  const audioEnabled = mode === 'video' && micPerm.hasPermission;

  // 시트가 열릴 때 권한 요청. 거부된 상태면 fallback UI 노출.
  useEffect(() => {
    if (!visible) return;
    if (!cameraPerm.hasPermission) {
      cameraPerm.requestPermission();
    }
    if (mode === 'video' && !micPerm.hasPermission) {
      micPerm.requestPermission();
    }
  }, [visible, mode, cameraPerm, micPerm]);

  // 시트 닫힐 때 녹화 중이면 중단.
  useEffect(() => {
    if (!visible && recording) {
      cameraRef.current?.stopRecording().catch(() => undefined);
      setRecording(false);
    }
  }, [visible, recording]);

  const handlePhoto = useCallback(async () => {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      const uri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
      const byteSize = await measureFileBytes(uri);
      // iOS 는 기본 HEIC, Android 는 JPEG — 확장자로 mime 추정.
      const mime: CapturedMedia['mime'] =
        photo.path.toLowerCase().endsWith('.heic') ? 'image/heic' : 'image/jpeg';
      onCaptured({
        kind: 'IMAGE',
        uri,
        mime,
        byteSize,
        width: photo.width,
        height: photo.height,
        durationMs: null,
      });
    } catch (e) {
      Alert.alert(t('session.log.cameraError'), describeError(e));
    } finally {
      setBusy(false);
    }
  }, [busy, onCaptured]);

  const handleStartRecording = useCallback(() => {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    setRecording(true);
    cameraRef.current.startRecording({
      onRecordingFinished: async (video) => {
        const startedAt = Date.now();
        const uri = video.path.startsWith('file://') ? video.path : `file://${video.path}`;
        try {
          const byteSize = await measureFileBytes(uri);
          const mime: CapturedMedia['mime'] = video.path.toLowerCase().endsWith('.mov')
            ? 'video/quicktime'
            : 'video/mp4';
          onCaptured({
            kind: 'VIDEO',
            uri,
            mime,
            byteSize,
            width: null,
            height: null,
            durationMs: Math.round(video.duration * 1000),
          });
        } catch (e) {
          Alert.alert(t('session.log.cameraError'), describeError(e));
        } finally {
          setBusy(false);
          setRecording(false);
          // startedAt 은 단순 디버깅용 — 사용 안 함.
          void startedAt;
        }
      },
      onRecordingError: (err: CameraCaptureError) => {
        setBusy(false);
        setRecording(false);
        Alert.alert(t('session.log.cameraError'), err.message);
      },
    });
  }, [busy, onCaptured]);

  const handleStopRecording = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      await cameraRef.current.stopRecording();
    } catch (e) {
      Alert.alert(t('session.log.cameraError'), describeError(e));
    }
    // recording 상태와 busy 해제는 onRecordingFinished 콜백에서 일어남.
  }, []);

  const handleShoot = useCallback(() => {
    if (mode === 'photo') {
      void handlePhoto();
      return;
    }
    if (recording) {
      void handleStopRecording();
    } else {
      handleStartRecording();
    }
  }, [mode, recording, handlePhoto, handleStartRecording, handleStopRecording]);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType={reducedMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={onClose}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={t('session.log.cancel')}
            hitSlop={8}
          >
            <CrimpIcon.close size={20} color={CAMERA_FG} />
          </Pressable>

          {recording ? (
            <View style={styles.recPill}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>REC</Text>
            </View>
          ) : (
            <View style={styles.recSpacer} />
          )}

          <View style={styles.iconBtn}>
            {/* 추후 flip 카메라용 — 현재는 정적 아이콘 */}
            <CrimpIcon.dots size={20} color={CAMERA_FG} />
          </View>
        </View>

        {/* Viewfinder */}
        <View style={styles.viewfinder}>
          {!cameraPerm.hasPermission ? (
            <PermissionFallback
              styles={styles}
              onRetry={() => cameraPerm.requestPermission()}
            />
          ) : !device ? (
            <View style={styles.fallbackBox}>
              <Text style={styles.fallbackTitle}>{t('session.log.cameraNoDevice')}</Text>
            </View>
          ) : (
            <>
              <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={visible}
                photo={mode === 'photo'}
                video={mode === 'video'}
                audio={audioEnabled}
              />
              {/* focus reticle */}
              <View style={styles.reticle} pointerEvents="none" />
              {/* mode indicator */}
              <View style={styles.modeIndicator}>
                <Text style={styles.modeLabel}>
                  {mode === 'video'
                    ? t('session.log.cameraVideoTitle')
                    : t('session.log.cameraPhotoTitle')}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Bottom bar — shutter */}
        <View style={styles.bottomBar}>
          <View style={styles.shutterSide} />

          <Pressable
            onPress={handleShoot}
            disabled={busy && !recording}
            style={styles.shutter}
            accessibilityRole="button"
            accessibilityLabel={
              mode === 'video'
                ? t('session.log.cameraVideoTitle')
                : t('session.log.cameraPhotoTitle')
            }
          >
            <View style={styles.shutterRing} />
            {busy && !recording ? (
              <ActivityIndicator color={CAMERA_FG} />
            ) : (
              <View
                style={[
                  styles.shutterInner,
                  mode === 'video'
                    ? recording
                      ? styles.shutterInnerVideoRecording
                      : styles.shutterInnerVideo
                    : styles.shutterInnerPhoto,
                ]}
              />
            )}
          </Pressable>

          <View style={styles.shutterSide} />
        </View>
      </View>
    </Modal>
  );
}

function PermissionFallback({
  styles,
  onRetry,
}: {
  styles: ReturnType<typeof makeStyles>;
  onRetry: () => void;
}) {
  return (
    <View style={styles.fallbackBox}>
      <Text style={styles.fallbackTitle}>{t('session.log.cameraPermissionTitle')}</Text>
      <Text style={styles.fallbackBody}>{t('session.log.cameraPermissionBody')}</Text>
      <Pressable onPress={onRetry} style={styles.fallbackBtn} accessibilityRole="button">
        <Text style={styles.fallbackBtnLabel}>{t('session.log.cameraPermissionRetry')}</Text>
      </Pressable>
    </View>
  );
}

function describeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'unknown';
}

function makeStyles(theme: Theme) {
  const recBg = withAlpha(theme.semantic.danger, 0.92);
  const glassBg = withAlpha(CAMERA_FG, 0.16);
  const overlayBg = withAlpha(CAMERA_BG, 0.4);
  const reticleBorder = withAlpha(CAMERA_FG, 0.7);

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: CAMERA_BG,
    },
    topBar: {
      paddingTop: space[10] + space[4],
      paddingHorizontal: space[4],
      paddingBottom: space[2],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: glassBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recPill: {
      paddingHorizontal: space[3],
      paddingVertical: 6,
      borderRadius: radius.full,
      backgroundColor: recBg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[1],
    },
    recDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: CAMERA_FG,
    },
    recText: {
      fontFamily,
      fontSize: 12,
      fontWeight: fontWeight.extrabold,
      color: CAMERA_FG,
      letterSpacing: 0.48,
    },
    recSpacer: {
      width: 1,
      height: 1,
    },
    viewfinder: {
      flex: 1,
      backgroundColor: CAMERA_BG,
      position: 'relative',
      overflow: 'hidden',
    },
    reticle: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: 80,
      height: 80,
      marginLeft: -40,
      marginTop: -40,
      borderWidth: 1.5,
      borderColor: reticleBorder,
      borderRadius: radius.sm,
    },
    modeIndicator: {
      position: 'absolute',
      bottom: space[4],
      left: space[4],
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      backgroundColor: overlayBg,
      borderRadius: radius.md,
    },
    modeLabel: {
      fontFamily,
      fontSize: 12,
      fontWeight: fontWeight.bold,
      color: CAMERA_FG,
    },
    bottomBar: {
      paddingHorizontal: space[6],
      paddingBottom: space[14],
      paddingTop: space[4],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: CAMERA_BG,
    },
    shutterSide: {
      width: 50,
      height: 50,
    },
    shutter: {
      width: 78,
      height: 78,
      borderRadius: 39,
      alignItems: 'center',
      justifyContent: 'center',
    },
    shutterRing: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 39,
      borderWidth: 4,
      borderColor: CAMERA_FG,
    },
    shutterInner: {
      width: 60,
      height: 60,
      borderRadius: 30,
    },
    shutterInnerVideo: {
      backgroundColor: theme.semantic.danger,
    },
    shutterInnerVideoRecording: {
      width: 32,
      height: 32,
      borderRadius: 6,
      backgroundColor: theme.semantic.danger,
    },
    shutterInnerPhoto: {
      backgroundColor: CAMERA_FG,
    },
    fallbackBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space[6],
      gap: space[3],
    },
    fallbackTitle: {
      fontFamily,
      fontSize: 18,
      fontWeight: fontWeight.bold,
      color: CAMERA_FG,
      textAlign: 'center',
    },
    fallbackBody: {
      fontFamily,
      fontSize: 14,
      color: withAlpha(CAMERA_FG, 0.7),
      textAlign: 'center',
      lineHeight: 20,
    },
    fallbackBtn: {
      marginTop: space[3],
      paddingHorizontal: space[5],
      paddingVertical: space[2],
      borderRadius: radius.full,
      backgroundColor: glassBg,
    },
    fallbackBtnLabel: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.bold,
      color: CAMERA_FG,
    },
  });
}
