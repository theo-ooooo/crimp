import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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

import { CrimpIcon } from '@/components/common/primitives';
import { CameraPermissionIntro } from '@/components/common/session/CameraPermissionIntro';
import { useCameraEntryPermissions } from '@/hooks/permissions/useCameraEntryPermissions';
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
 * vision-camera 5.x 기반. 권한 처리 → preview → photo/video 캡처 → 미리보기(사용/다시촬영)
 * → 파일 메타 측정 → 부모에게 {@link CapturedMedia} 전달. PR-3 (PR #92) 의 업로드 흐름은
 * 사용자가 "사용" 을 누른 시점부터 시작.
 *
 * <p>흐름 (PR #97 F5 PR-5 기준):
 * <ol>
 *   <li>shutter → photo/video 캡처 → setPending(media)</li>
 *   <li>{@link CapturePreview} 가 viewfinder + shutter 자리를 차지하며 사용/다시촬영 노출</li>
 *   <li>"다시촬영" → setPending(null) → viewfinder 복귀</li>
 *   <li>"사용" → onCaptured(pending) → 부모가 시트 닫고 업로드 시작</li>
 * </ol>
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
  // (PR #115 후속) 카메라 flip — back/front 토글. 사용자 피드백으로 우상단 메뉴를 정적
  // dots 에서 동작하는 flip 버튼으로 교체.
  const [cameraPosition, setCameraPosition] = useState<'back' | 'front'>('back');
  // (PR #115 후속) physicalDevices 명시 — vision-camera 의 useCameraDevice('back') 기본값은
  // 'best' 단일 wide-angle 디바이스를 고를 수 있어 minZoom=1 로 떨어지고 0.5× 가 적용되지
  // 않는다. ultrawide + wide + telephoto 3종을 모두 묶은 multi-cam **virtual device** 를
  // 명시적으로 요청해야 minZoom=0.5 가 노출되어 0.5× → ultrawide 렌즈 자동 스위치 동작.
  // front 는 일반적으로 단일 wide 라 hint 무영향 (있어도 안전).
  const device = useCameraDevice(cameraPosition, {
    physicalDevices: [
      'ultra-wide-angle-camera',
      'wide-angle-camera',
      'telephoto-camera',
    ],
  });
  const cameraPerm = useCameraPermission();
  const micPerm = useMicrophonePermission();

  // (PR #115 후속) 줌 컨트롤 — vision-camera 의 controlled `zoom` prop 사용.
  //
  // ⚠️ 좌표계 주의 — multi-cam virtual device 의 vision-camera `zoom` 값은 **가장 넓은
  // 렌즈(ultrawide) 의 native FOV 가 1.0** 이고, neutral(=wide) 은 보통 2.0, 사용자가
  // 부르는 "2×" 는 약 4.0 이다 (== neutralZoom × userMultiplier).
  // iPhone Camera 앱 UI 와 동일한 사용자 친화 레이블 (0.5×/1×/2×/3×) 을 그대로 보여주려면
  // user-zoom × neutralZoom = device-zoom 변환이 필요. 사용자 피드백:
  // "최초 1배가아니라 2배로 잡히고 0.5는 클릭도안됨, 1배가 0.5배줌인듯" — 좌표계 미변환
  // 회귀.
  const [zoom, setZoom] = useState<number>(1);
  // 디바이스 변경 (시트 재진입 등) 시 사용자 기준 1× = neutralZoom 으로 리셋.
  useEffect(() => {
    if (device) {
      setZoom(device.neutralZoom ?? 1);
    }
  }, [device]);
  const zoomLevels = useMemo(() => {
    if (!device) return [1] as readonly number[];
    const neutral = device.neutralZoom ?? 1;
    const max = device.maxZoom ?? 1;
    // 사용자 기준 [0.5, 1, 2, 3] 중 디바이스가 처리 가능한 (user × neutral ≤ max) 것만 노출.
    return [0.5, 1, 2, 3].filter((u) => u * neutral <= max);
  }, [device]);

  // 사용자 기준 zoom (예: 0.5/1/2/3) → 디바이스 zoom 좌표로 변환 + min/max 클램프.
  const applyZoom = useCallback(
    (userZoom: number) => {
      if (!device) return;
      const neutral = device.neutralZoom ?? 1;
      const min = device.minZoom ?? 1;
      const max = device.maxZoom ?? 1;
      const target = Math.max(min, Math.min(max, userZoom * neutral));
      setZoom(target);
    },
    [device],
  );

  // 칩 active 비교를 위해 현재 zoom 을 사용자 좌표로 환산.
  const currentUserZoom = useMemo(() => {
    if (!device) return 1;
    const neutral = device.neutralZoom ?? 1;
    return zoom / neutral;
  }, [zoom, device]);

  // [PR #100, F5 PR-B] 카메라/마이크/위치 묶음 권한 체크 + 인트로 모달.
  // visible 일 때만 active — 시트 닫혀있을 때 불필요한 OS 호출 방지.
  const entryPerms = useCameraEntryPermissions(visible);
  // 인트로는 시트 진입 후 1회만 — 사용자가 "건너뛰기" 누르거나 결정 끝낸 뒤에는 같은
  // 세션에서 다시 띄우지 않음. 시트가 닫혔다 다시 열리면 useEffect 가 false 로 초기화.
  const [introDismissed, setIntroDismissed] = useState(false);
  // [PR #100 리뷰 I3·I4] handlePermAllow 더블탭 + unmount 가드.
  // - I3: requestAll 진행 중 사용자가 "허용" 다시 탭하면 OS 다이얼로그 race. 동기 ref 로 차단.
  // - I4: requestAll 도중 시트 X 닫히면 setIntroDismissed 가 unmounted 후 fire. visible 가드.
  // [PR #101 폴리시] visibleRef 갱신을 useEffect 로 이동 (React 18 strict mode + concurrent
  // rendering 안전). visible 변경 시 시점에 .current 가 최신 값을 보장.
  const allowingRef = useRef(false);
  const visibleRef = useRef(visible);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  // [PR #97, F5 PR-5] 캡처 직후 자동 업로드 대신 미리보기 + 사용/다시촬영 분기.
  // pending != null 이면 viewfinder 위로 preview 오버레이가 떠 있는 상태.
  // "사용" 으로만 onCaptured 가 발동, "다시촬영" 은 pending 만 비우고 viewfinder 복귀.
  const [pending, setPending] = useState<CapturedMedia | null>(null);
  // [PR #97 리뷰 I1] handleConfirm 더블탭 가드. 같은 렌더 클로저에서 두 번의 onPress 가
  // 들어와 둘 다 `pending !== null` 체크를 통과해 onCaptured 가 2회 발동 → 부모 업로드
  // 중복 시작을 차단. 동기 ref 라 setState 의 다음 렌더 반영을 기다리지 않아도 됨.
  // 다음 캡처(setPending(media))가 들어올 때 false 로 리셋.
  const confirmingRef = useRef(false);
  // [PR #91 리뷰 I3] 시트 닫힘으로 녹화가 강제 종료된 경우, onRecordingFinished 콜백이
  // 사후 발동해도 onCaptured 를 호출하지 않도록 표시. 사용자가 "취소했는데 캡처 Alert"
  // 가 뜨는 회귀를 차단.
  const cancelRequestedRef = useRef(false);
  // (PR #115 후속) 10분 자동 컷오프 타이머 핸들 — start 시 set, stop/finish/error/unmount 시 clear.
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 영상 모드인데 mic 권한이 없으면 사운드 없이 녹화 — 권한 요청은 시트 진입 시 한 번 시도.
  const audioEnabled = mode === 'video' && micPerm.hasPermission;

  // [PR #100] 인트로 모달이 권한 요청을 책임지므로 본 useEffect 는 인트로가 닫힌 뒤
  // (introDismissed=true) 에만 vision-camera 의 자체 훅으로 세부 보정을 수행.
  // 인트로에서 "허용" 누르면 react-native-permissions 가 OS 다이얼로그를 한 번에 띄우고,
  // "건너뛰기" 면 본 훅으로도 추가 시도하지 않는다 (각 권한별 fallback UI 가 처리).
  useEffect(() => {
    if (!visible || !introDismissed) {
      return;
    }
    // 인트로가 닫힌 직후 vision-camera 가 자체 캐시한 권한 상태 동기화.
    // 본 호출은 OS 다이얼로그를 추가로 띄우지 않음 (이미 거부되었거나 허용된 상태 단순 조회).
    if (!cameraPerm.hasPermission) {
      cameraPerm.requestPermission();
    }
    if (mode === 'video' && !micPerm.hasPermission) {
      micPerm.requestPermission();
    }
  }, [visible, introDismissed, mode, cameraPerm, micPerm]);

  // [PR #100] 시트 재진입 시 인트로 dismissed 상태 초기화 — 다시 열면 인트로가 다시 떠야 함
  // (단, 사용자가 영구 거부했을 땐 인트로의 "설정으로 이동" 으로 자연스럽게 유도).
  useEffect(() => {
    if (!visible && introDismissed) {
      setIntroDismissed(false);
    }
  }, [visible, introDismissed]);

  // 시트 닫힐 때 녹화 중이면 중단 — cancelRequestedRef 를 세팅해 onRecordingFinished 가
  // onCaptured 를 발동하지 않도록 표시. pending preview 도 함께 폐기 (시트 재진입 시
  // 이전 캡처가 그대로 떠 있는 회귀 차단).
  useEffect(() => {
    if (!visible && recording) {
      cancelRequestedRef.current = true;
      cameraRef.current?.stopRecording().catch(() => undefined);
      setRecording(false);
      // (PR #115 후속) 시트 닫힘 → max-duration 타이머도 함께 정리.
      if (maxDurationTimerRef.current) {
        clearTimeout(maxDurationTimerRef.current);
        maxDurationTimerRef.current = null;
      }
    }
    if (!visible && pending) {
      setPending(null);
    }
  }, [visible, recording, pending]);

  // unmount 시 잔류 타이머 정리.
  useEffect(() => {
    return () => {
      if (maxDurationTimerRef.current) {
        clearTimeout(maxDurationTimerRef.current);
        maxDurationTimerRef.current = null;
      }
    };
  }, []);

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
      // [PR #97 F5 PR-5] onCaptured 즉시 발동 → setPending 으로 변경. 사용자가 "사용"
      // 누를 때 onCaptured 가 발동되어 부모(SessionDetailScreen)의 업로드 흐름이 시작.
      // [I1] 새 캡처가 들어오면 confirmingRef 도 리셋 — 이전 캡처 confirm 후 곧장 다음 촬영해도
      // 가드가 막지 않도록.
      confirmingRef.current = false;
      setPending({
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
  }, [busy]);

  const handleStartRecording = useCallback(() => {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    setRecording(true);
    cancelRequestedRef.current = false;
    // (PR #115 후속) 10분 자동 컷오프 — vision-camera 의 maxDuration 옵션 사용.
    // Apple Photo 의 ProRes / 일반 사용자 영상 기준 10분이 합리적 상한 (S3/CloudFront 비용 +
    // FeedPost video duration 상한 동시 충족). 한도 도달 시 vision-camera 가 자동으로
    // onRecordingFinished 호출.
    const MAX_RECORDING_SECONDS = 600;
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
          // [PR #97 F5 PR-5] onCaptured 즉시 발동 → setPending 으로 변경 (사진과 동일).
          // [I1] 새 캡처마다 confirmingRef 리셋.
          confirmingRef.current = false;
          setPending({
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
          if (maxDurationTimerRef.current) {
            clearTimeout(maxDurationTimerRef.current);
            maxDurationTimerRef.current = null;
          }
        }
      },
      onRecordingError: (err: CameraCaptureError) => {
        setBusy(false);
        setRecording(false);
        cancelRequestedRef.current = false;
        if (maxDurationTimerRef.current) {
          clearTimeout(maxDurationTimerRef.current);
          maxDurationTimerRef.current = null;
        }
        Alert.alert(t('session.log.cameraError'), err.message);
      },
    });
    // vision-camera 4.x 의 RecordVideoOptions 에 maxDuration 미지원 → JS 측 setTimeout
    // 으로 자동 stopRecording 트리거. 10분 도달 시 onRecordingFinished 가 호출되어
    // 정상 캡처 흐름으로 흡수됨 (잘리지 않은 만큼 저장).
    maxDurationTimerRef.current = setTimeout(() => {
      maxDurationTimerRef.current = null;
      cameraRef.current?.stopRecording().catch(() => undefined);
    }, MAX_RECORDING_SECONDS * 1000);
  }, [busy]);

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

  // [PR #97 F5 PR-5] 미리보기 액션. "사용" 은 setPending(null) → onCaptured 순서가 중요 —
  // 부모가 onCaptured 안에서 setCameraOpen(false) 를 호출하므로 visible 이 false 가 되며,
  // 그 시점에는 이미 pending 이 비어있어 위쪽 useEffect 의 cleanup 이 no-op. 반대 순서면
  // 부모 close → useEffect 가 setPending(null) 을 한 번 더 — 결과는 같지만 노이즈.
  const handleConfirm = useCallback(() => {
    // [PR #97 리뷰 I1] 더블탭 가드 — 같은 클로저 두 번 진입 시 confirmingRef 가 동기적으로
    // 두 번째 호출을 차단해 onCaptured 중복 발동 방지.
    if (!pending || confirmingRef.current) return;
    confirmingRef.current = true;
    const captured = pending;
    setPending(null);
    onCaptured(captured);
  }, [pending, onCaptured]);

  const handleRetake = useCallback(() => {
    setPending(null);
  }, []);

  // [PR #100, F5 PR-B] 인트로 표시 결정 — entryPerms.ready 가 true 이고 (OS 응답 도착)
  // needsIntro 가 true (denied 인 권한 1개 이상) 인 경우만. introDismissed 면 사용자가
  // 이미 건넌 상태라 다시 띄우지 않음.
  const showPermIntro = visible && entryPerms.ready && entryPerms.state.needsIntro && !introDismissed;

  const handlePermAllow = useCallback(async () => {
    if (allowingRef.current) {
      return;
    }
    allowingRef.current = true;
    try {
      await entryPerms.requestAll();
    } finally {
      allowingRef.current = false;
    }
    // [I4] requestAll 도중 시트가 닫혔으면 setIntroDismissed 시도 X — 다음 진입 시 인트로
    // 다시 보여야 일관됨.
    if (!visibleRef.current) {
      return;
    }
    setIntroDismissed(true);
  }, [entryPerms]);

  const handlePermSkip = useCallback(() => {
    setIntroDismissed(true);
  }, []);

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

          <Pressable
            onPress={() =>
              setCameraPosition((prev) => (prev === 'back' ? 'front' : 'back'))
            }
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={t('session.log.cameraFlip')}
            hitSlop={8}
            disabled={recording}
          >
            <CrimpIcon.flip size={20} color={CAMERA_FG} />
          </Pressable>
        </View>

        {pending ? (
          // [PR #97 F5 PR-5] 캡처 미리보기. 사용/다시촬영 분기 — viewfinder 와 shutter 모두
          // 숨기고 Camera 컴포넌트를 unmount 해 자원 절약 (preview 동안 isActive 처리 불필요).
          <CapturePreview
            media={pending}
            styles={styles}
            onRetake={handleRetake}
            onConfirm={handleConfirm}
          />
        ) : (
          <>
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
                    zoom={zoom}
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
                  {/* (PR #115 후속) 줌 셀렉터 — viewfinder 위, shutter 바로 위쪽. */}
                  {zoomLevels.length > 1 ? (
                    <View style={styles.zoomBar} pointerEvents="auto">
                      {zoomLevels.map((z) => {
                        // active 비교는 사용자 좌표 기준 (currentUserZoom). vision-camera
                        // 의 raw zoom 은 multi-cam 가상 디바이스에서 neutral 배수라 직접 비교 X.
                        const active = Math.abs(currentUserZoom - z) < 0.05;
                        return (
                          <Pressable
                            key={z}
                            onPress={() => applyZoom(z)}
                            style={[styles.zoomChip, active && styles.zoomChipActive]}
                            accessibilityRole="button"
                            accessibilityLabel={`${z}x zoom`}
                            accessibilityState={{ selected: active }}
                            hitSlop={6}
                          >
                            <Text style={[styles.zoomChipLabel, active && styles.zoomChipLabelActive]}>
                              {z}×
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
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
          </>
        )}

        {/* [PR #100, F5 PR-B] 권한 인트로 — viewfinder/preview 위에 떠 있는 inline overlay.
            CrimpModal 을 쓰지 않는 이유는 CameraSheet 자체가 RN Modal 안에서 동작 → nested
            Modal 의 iOS 가림 한계 회피 (CameraPermissionIntro JSDoc 참조). */}
        <CameraPermissionIntro
          visible={showPermIntro}
          cameraStatus={entryPerms.state.camera}
          microphoneStatus={entryPerms.state.microphone}
          locationStatus={entryPerms.state.location}
          onAllow={handlePermAllow}
          onSkip={handlePermSkip}
        />
      </View>
    </Modal>
  );
}

/**
 * 캡처 미리보기 — 사용/다시촬영 분기 (PR #97, F5 PR-5).
 *
 * <p>이미지: 전체 화면 `<Image>` (resizeMode=contain) — vision-camera 로 받은 file:// URI
 * 그대로 표시.
 * <p>영상: 재생 라이브러리(react-native-video / expo-video)가 아직 미도입이라 Phase 1 은
 * 메타(길이·크기) + "재생은 다음 업데이트" 안내. 사용자는 다시촬영 여부만 결정하면 됨 —
 * 녹화 직후라 '뭐 찍었는지' 는 본인이 알고 있음.
 */
function CapturePreview({
  media,
  styles,
  onRetake,
  onConfirm,
}: {
  media: CapturedMedia;
  styles: ReturnType<typeof makeStyles>;
  onRetake: () => void;
  onConfirm: () => void;
}) {
  const isImage = media.kind === 'IMAGE';
  // [PR #97 리뷰 I3] 미디어 영역 사진/영상 명시 — 보이스오버 사용자가 무엇을 미리보고 있는지 인식.
  const mediaA11y = isImage
    ? t('session.log.capturePreviewPhotoA11y')
    : t('session.log.capturePreviewVideoA11y');
  return (
    <>
      <View
        style={styles.previewMediaWrap}
        // [PR #98 리뷰] role="image" 는 사진 브랜치에만 — 영상 브랜치는 메타 패널이라
        // image 라고 선언하면 의미 불일치. 영상은 라벨만으로 컨텍스트 전달.
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
            <View style={styles.previewVideoIcon}>
              <CrimpIcon.play size={42} color={CAMERA_FG} />
            </View>
            <Text style={styles.previewVideoMeta}>{formatVideoMeta(media)}</Text>
            <Text style={styles.previewVideoNote}>
              {t('session.log.capturePreviewVideoNoPlayback')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.previewActions}>
        {/* [PR #97 리뷰 I3] header role — 보이스오버가 컨텍스트 헤더로 인식. */}
        <Text style={styles.previewTitle} accessibilityRole="header">
          {t('session.log.capturePreviewTitle')}
        </Text>
        <View style={styles.previewButtonRow}>
          <Pressable
            onPress={onRetake}
            style={[styles.previewBtn, styles.previewBtnGhost]}
            accessibilityRole="button"
            accessibilityLabel={t('session.log.capturePreviewRetake')}
          >
            <Text style={styles.previewBtnGhostLabel}>
              {t('session.log.capturePreviewRetake')}
            </Text>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            style={[styles.previewBtn, styles.previewBtnPrimary]}
            accessibilityRole="button"
            accessibilityLabel={t('session.log.capturePreviewConfirm')}
          >
            <Text style={styles.previewBtnPrimaryLabel}>
              {t('session.log.capturePreviewConfirm')}
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

/**
 * [PR #97 리뷰 I2] 단위 하드코딩 → i18n 템플릿 분리. ko/en 양쪽에 `{{seconds}}`/`{{mb}}`
 * placeholder 가 정의돼 있어 locale 별 단위 표기/순서 자유. 코드는 코드베이스 관습대로
 * `.replace('{{key}}', value)` 로 치환 (FeedPostCard 등과 동일 패턴).
 */
function formatVideoMeta(media: CapturedMedia): string {
  const seconds = media.durationMs ? Math.round(media.durationMs / 1000) : 0;
  const mb = (media.byteSize / (1024 * 1024)).toFixed(1);
  return t('session.log.capturePreviewVideoMeta')
    .replace('{{seconds}}', String(seconds))
    .replace('{{mb}}', mb);
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
    // (PR #115 후속) 줌 셀렉터 — viewfinder 하단 중앙, shutter 위쪽.
    zoomBar: {
      position: 'absolute',
      bottom: space[4],
      alignSelf: 'center',
      flexDirection: 'row',
      gap: space[2],
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      backgroundColor: overlayBg,
      borderRadius: radius.full,
    },
    zoomChip: {
      minWidth: 36,
      paddingHorizontal: space[3],
      paddingVertical: space[1],
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    zoomChipActive: {
      backgroundColor: theme.accent.base,
    },
    zoomChipLabel: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: CAMERA_FG,
    },
    zoomChipLabelActive: {
      color: theme.accent.on,
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
    // [PR #97 F5 PR-5] 캡처 미리보기 영역 — viewfinder 자리 그대로 차지하고 하단은
    // shutter 대신 사용/다시촬영 버튼.
    previewMediaWrap: {
      flex: 1,
      backgroundColor: CAMERA_BG,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewMedia: {
      width: '100%',
      height: '100%',
    },
    previewVideoBox: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space[6],
      gap: space[3],
    },
    previewVideoIcon: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: glassBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space[2],
    },
    previewVideoMeta: {
      fontFamily,
      fontSize: 16,
      fontWeight: fontWeight.bold,
      color: CAMERA_FG,
    },
    previewVideoNote: {
      fontFamily,
      fontSize: 13,
      color: withAlpha(CAMERA_FG, 0.6),
      textAlign: 'center',
    },
    previewActions: {
      paddingHorizontal: space[6],
      paddingBottom: space[14],
      paddingTop: space[4],
      gap: space[3],
      backgroundColor: CAMERA_BG,
    },
    previewTitle: {
      fontFamily,
      fontSize: 14,
      color: withAlpha(CAMERA_FG, 0.8),
      textAlign: 'center',
    },
    previewButtonRow: {
      flexDirection: 'row',
      gap: space[3],
    },
    previewBtn: {
      flex: 1,
      paddingVertical: space[3] + 2,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewBtnGhost: {
      backgroundColor: glassBg,
    },
    previewBtnGhostLabel: {
      fontFamily,
      fontSize: 15,
      fontWeight: fontWeight.bold,
      color: CAMERA_FG,
    },
    previewBtnPrimary: {
      backgroundColor: CAMERA_FG,
    },
    previewBtnPrimaryLabel: {
      fontFamily,
      fontSize: 15,
      fontWeight: fontWeight.extrabold,
      color: CAMERA_BG,
    },
  });
}
