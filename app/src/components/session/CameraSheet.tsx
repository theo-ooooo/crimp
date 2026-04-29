import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
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
import { measureFileBytes, readImageMeta, type DetectedImageMime } from '@/lib/camera/measure';
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
  // [PR #91 리뷰 I3] 시트 닫힘으로 녹화가 강제 종료된 경우, onRecordingFinished 콜백이
  // 사후 발동해도 onCaptured 를 호출하지 않도록 표시. 사용자가 "취소했는데 캡처 Alert"
  // 가 뜨는 회귀를 차단.
  const cancelRequestedRef = useRef(false);
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

  // 시트 닫힐 때 녹화 중이면 중단 — cancelRequestedRef 를 세팅해 onRecordingFinished 가
  // onCaptured 를 발동하지 않도록 표시.
  useEffect(() => {
    if (!visible && recording) {
      cancelRequestedRef.current = true;
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
      // [PR #91 리뷰 B1] 헤더 시그니처로 실제 codec 검출 — vision-camera v4 의 iOS 가
      // HEIC 바이트를 항상 .jpg 확장자로 저장하므로 확장자 추정은 신뢰할 수 없음.
      // [PR #95 후속] RN 의 FileReader 도 unavailable 한 환경에선 meta.mime === null —
      // 그 경우 확장자/플랫폼 기반 fallback 사용 (Android 는 항상 JPEG, iOS 는 HEIC 우세).
      const meta = await readImageMeta(uri);
      const mime: CapturedMedia['mime'] = resolvePhotoMime(meta.mime, photo.path);
      onCaptured({
        kind: 'IMAGE',
        uri,
        mime,
        byteSize: meta.byteSize,
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
    cancelRequestedRef.current = false;
    cameraRef.current.startRecording({
      onRecordingFinished: async (video) => {
        try {
          // [PR #91 리뷰 I3] 시트 닫힘으로 강제 종료된 녹화면 onCaptured 발동 X.
          if (cancelRequestedRef.current) return;

          const uri = video.path.startsWith('file://') ? video.path : `file://${video.path}`;
          const byteSize = await measureFileBytes(uri);
          // 영상 확장자는 vision-camera v4 가 platform 기본값(iOS=.mov, Android=.mp4) 으로
          // 정확히 저장하므로 확장자 추정이 신뢰 가능.
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
          cancelRequestedRef.current = false;
        }
      },
      onRecordingError: (err: CameraCaptureError) => {
        setBusy(false);
        setRecording(false);
        cancelRequestedRef.current = false;
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
              onOpenSettings={() => Linking.openSettings()}
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
  onOpenSettings,
}: {
  styles: ReturnType<typeof makeStyles>;
  onRetry: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <View style={styles.fallbackBox}>
      <Text style={styles.fallbackTitle}>{t('session.log.cameraPermissionTitle')}</Text>
      <Text style={styles.fallbackBody}>{t('session.log.cameraPermissionBody')}</Text>
      <Pressable onPress={onRetry} style={styles.fallbackBtn} accessibilityRole="button">
        <Text style={styles.fallbackBtnLabel}>{t('session.log.cameraPermissionRetry')}</Text>
      </Pressable>
      {/* [PR #91 리뷰 I4] 영구 거부 사용자도 진행할 수 있도록 시스템 설정 진입 보조 버튼. */}
      <Pressable onPress={onOpenSettings} style={styles.fallbackBtnGhost} accessibilityRole="button">
        <Text style={styles.fallbackBtnGhostLabel}>{t('session.log.cameraPermissionSettings')}</Text>
      </Pressable>
    </View>
  );
}

function describeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'unknown';
}

/**
 * 사진 mime 결정 (PR #95 후속 — RN 호환).
 * 헤더 시그니처가 잡히면 우선, 안 잡히면 확장자 → 플랫폼 기본값 순으로 fallback.
 *
 * <p>- 헤더가 image/heic 면 그대로 (vision-camera v4 가 iOS 에서 .jpg 확장자로 저장해도 헤더로 진실 결정)
 * <p>- 헤더가 image/jpeg 면 그대로
 * <p>- 헤더 검출 실패 (FileReader 미지원 등):
 *   <ul>
 *     <li>확장자가 명시적 .heic 면 그대로 image/heic</li>
 *     <li>iOS 는 vision-camera v4 가 HEIC 바이트도 .jpg 로 저장 (PR #91 B1) — 신형 iPhone 기본 HEIC
 *         우세 → 'image/heic' 추정. 백엔드 화이트리스트에 둘 다 있어 PUT 호환.</li>
 *     <li>Android 는 항상 JPEG 라 'image/jpeg'.</li>
 *   </ul>
 *
 * @see {@link readImageMeta} — 헤더 시그니처 기반 검출 (RN 환경 의존)
 */
function resolvePhotoMime(detected: DetectedImageMime | null, path: string): CapturedMedia['mime'] {
  if (detected === 'image/heic') return 'image/heic';
  if (detected === 'image/jpeg') return 'image/jpeg';
  // 헤더 미검출 — 확장자 우선, 그 외에는 플랫폼 기본.
  if (path.toLowerCase().endsWith('.heic')) return 'image/heic';
  // [PR #95 리뷰 B1] iOS 는 .jpg 확장자라도 실 바이트가 HEIC 일 수 있음 (vision-camera v4 가 iOS HEIC 를
  // 항상 .jpg 로 저장). 신형 iPhone 의 기본 HEIC 모드 우세 → 헤더 검출 실패 시 'image/heic' 추정으로
  // CDN/MediaConvert 의 wrong Content-Type 처리 위험 최소화.
  if (Platform.OS === 'ios') return 'image/heic';
  return 'image/jpeg';
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
    fallbackBtnGhost: {
      paddingHorizontal: space[3],
      paddingVertical: space[1],
    },
    fallbackBtnGhostLabel: {
      fontFamily,
      fontSize: 13,
      color: withAlpha(CAMERA_FG, 0.7),
      textDecorationLine: 'underline',
    },
  });
}
