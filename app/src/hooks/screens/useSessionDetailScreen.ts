import { useCallback, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { useAttemptsQuery } from '@/hooks/queries/useAttempts';
import { useEndSession, useSessionQuery } from '@/hooks/queries/useSessions';
import { toUserMessage } from '@/lib/api/errorMessage';
import { ApiError } from '@/lib/api/errors';
import type { CapturedMedia } from '@/lib/camera/types';
import { t } from '@/lib/i18n';
import {
  MediaUploadError,
  uploadCapturedMedia,
  uploadVideoWithOptionalPoster,
} from '@/lib/media/upload';
import type { Attempt } from '@/lib/schemas/attempt';
import type { CameraMode } from '@/components/common/session';

export function useSessionDetailScreen(accessToken: string, extId: string) {
  const sessionQuery = useSessionQuery(accessToken, extId);
  const attemptsQuery = useAttemptsQuery(accessToken, extId);
  const endSession = useEndSession(accessToken);

  const [logSheetOpen, setLogSheetOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('video');
  // (PR #116 리뷰 I2) 압축 단계와 업로드 단계를 분리해 spinner 라벨 분기.
  // 'compressing' 은 비디오 10분 짜리 압축이 30s+ 걸리는 동안 사용자가 '시트가 멈췄나'
  // 오인하는 회귀 차단. CapturedMedia 가 도착하면 압축 → 업로드 순서로 phase 가 바뀜.
  const [mediaPhase, setMediaPhase] = useState<'idle' | 'compressing' | 'uploading'>(
    'idle',
  );
  const [uploadedMediaId, setUploadedMediaId] = useState<number | null>(null);
  const [videoAwaitingPoster, setVideoAwaitingPoster] = useState<CapturedMedia | null>(null);
  const pendingVideoForPosterRef = useRef<CapturedMedia | null>(null);

  const session = sessionQuery.data;
  const attempts: Attempt[] = attemptsQuery.data?.items ?? [];
  const isOngoing = session ? !session.endedAt : false;

  // (PR #115/#116) iOS RCTModalHostViewController 는 이미 표시 중인 modal 위에 또 다른
  // modal 을 present 하면 'already presenting' 으로 거부. LogAttemptSheet 와 CameraSheet
  // 둘 다 RN <Modal> 이라 동시에 visible=true 면 충돌.
  //
  // 이전엔 setTimeout(350ms) 으로 시리얼라이즈했으나 iPhone 17 등 일부 환경에서 그 안에
  // dismissal animation 이 끝나지 않아 회귀. 본 hook 은 RN Modal 의 onDismiss 콜백
  // (iOS 만 발화) 으로 정확한 시점에 다음 modal 을 연다 — pending intent 을 ref 로
  // 보관하다 onDismiss 안에서 flush. Android 는 nested Modal 허용이라 즉시 실행.
  const pendingCameraModeRef = useRef<CameraMode | null>(null);
  const pendingLogReopenRef = useRef<boolean>(false);
  // (PR #123) 비디오 캡처 → 카메라 dismiss → VideoPosterModal 시리얼라이즈.
  // CameraSheet 가 닫히는 동안 VideoPosterModal 을 present 하면 iOS 가 거절 →
  // 모달 자체가 안 떠 사용자가 "선택 불가능" 으로 인식.
  const pendingPosterAfterCameraRef = useRef<CapturedMedia | null>(null);
  // VideoPosterModal 이 닫힌 후 LogAttemptSheet 를 다시 띄울지 플래그.
  const pendingLogReopenAfterPosterRef = useRef<boolean>(false);

  const openCamera = (mode: CameraMode) => {
    // [PR #123 리뷰 I7] 카메라 새 세션 진입 시 이전 흐름의 pending ref 를 모두 초기화한다.
    // 사용자가 비디오 캡처 → poster 모달 도중 앱 백그라운드 → 복귀 → onCameraDismissed 미발화 →
    // pendingPosterAfterCameraRef 가 stale 로 남는 케이스를 방어. 다음 카메라 오픈 시 stale ref
    // 가 잘못된 시점에 flush 되는 것을 차단.
    pendingPosterAfterCameraRef.current = null;
    pendingLogReopenAfterPosterRef.current = false;
    pendingVideoForPosterRef.current = null;
    pendingLogReopenRef.current = false;
    if (Platform.OS === 'android') {
      setCameraMode(mode);
      setLogSheetOpen(false);
      setCameraOpen(true);
      return;
    }
    if (logSheetOpen) {
      pendingCameraModeRef.current = mode;
      setLogSheetOpen(false);
      // onLogSheetDismissed 가 dismissal 완료 후 setCameraOpen(true) 를 발동.
    } else {
      setCameraMode(mode);
      setCameraOpen(true);
    }
  };

  const onLogSheetDismissed = () => {
    const pending = pendingCameraModeRef.current;
    if (pending) {
      pendingCameraModeRef.current = null;
      setCameraMode(pending);
      setCameraOpen(true);
    }
  };

  const closeCamera = () => {
    if (Platform.OS === 'android') {
      setCameraOpen(false);
      setLogSheetOpen(true);
      return;
    }
    pendingLogReopenRef.current = true;
    setCameraOpen(false);
    // onCameraDismissed 에서 setLogSheetOpen(true) 발동.
  };

  const onCameraDismissed = () => {
    // 비디오 캡처 후 포스터 선택 모달 → 카메라 닫힘이 끝난 시점에 시리얼라이즈로 띄움.
    if (pendingPosterAfterCameraRef.current) {
      const captured = pendingPosterAfterCameraRef.current;
      pendingPosterAfterCameraRef.current = null;
      setVideoAwaitingPoster(captured);
      return;
    }
    if (pendingLogReopenRef.current) {
      pendingLogReopenRef.current = false;
      setLogSheetOpen(true);
    }
  };

  // VideoPosterModal 이 닫힌 후 LogAttemptSheet 를 시리얼라이즈로 띄움 (iOS).
  const onPosterModalDismissed = () => {
    if (pendingLogReopenAfterPosterRef.current) {
      pendingLogReopenAfterPosterRef.current = false;
      setLogSheetOpen(true);
    }
  };

  const onPosterUploadRequest = useCallback(
    (poster: CapturedMedia | null) => {
      const v = pendingVideoForPosterRef.current;
      pendingVideoForPosterRef.current = null;
      // iOS 는 VideoPosterModal 이 dismiss 되는 동안 LogAttemptSheet 를 또 띄우면 거절 —
      // pending 플래그 두고 onPosterModalDismissed 에서 띄움. Android 는 nested OK 라 즉시.
      if (Platform.OS === 'ios') {
        pendingLogReopenAfterPosterRef.current = true;
      }
      setVideoAwaitingPoster(null);
      if (Platform.OS === 'android') {
        setLogSheetOpen(true);
      }
      if (!v) {
        return;
      }
      setMediaPhase('compressing');
      const run = async () => {
        try {
          const completed = await uploadVideoWithOptionalPoster(accessToken, v, poster, {
            onPhase: (phase) => setMediaPhase(phase),
          });
          setUploadedMediaId(completed.id);
        } catch (e) {
          let body: string;
          if (e instanceof ApiError) {
            body = toUserMessage(e);
          } else if (e instanceof MediaUploadError) {
            body =
              e.phase === 'local-read'
                ? t('error.uploadLocalRead')
                : e.phase === 'network'
                  ? t('error.uploadNetwork')
                  : t('error.uploadS3');
          } else {
            body = t('session.log.uploadFailedRetry');
          }
          Alert.alert(t('session.log.uploadFailed'), body);
        } finally {
          setMediaPhase('idle');
          // LogAttemptSheet 재오픈은 위에서 (Android 는 즉시 / iOS 는 onPosterModalDismissed) 처리.
        }
      };
      run().catch(() => {});
    },
    [accessToken],
  );

  const handleCaptured = async (captured: CapturedMedia) => {
    if (captured.kind === 'VIDEO') {
      pendingVideoForPosterRef.current = captured;
      if (Platform.OS === 'ios') {
        // iOS: CameraSheet dismiss 가 끝난 뒤에 VideoPosterModal 을 띄움.
        // 동시 present 시 iOS RCTModalHostViewController 가 거절 → 모달이 안 떠
        // 사용자가 "선택 불가능" 으로 인식하던 회귀 차단.
        pendingLogReopenRef.current = false;
        pendingPosterAfterCameraRef.current = captured;
        setCameraOpen(false);
        setLogSheetOpen(false);
        return;
      }
      // Android: nested modal 허용이라 즉시 전환.
      setCameraOpen(false);
      setLogSheetOpen(false);
      setVideoAwaitingPoster(captured);
      return;
    }

    if (Platform.OS === 'ios') {
      pendingLogReopenRef.current = true;
    }
    setCameraOpen(false);
    if (Platform.OS === 'android') {
      setLogSheetOpen(true);
    }
    setMediaPhase('compressing');
    try {
      const completed = await uploadCapturedMedia(accessToken, captured, {
        onPhase: (phase) => setMediaPhase(phase),
      });
      setUploadedMediaId(completed.id);
    } catch (e) {
      let body: string;
      if (e instanceof ApiError) {
        body = toUserMessage(e);
      } else if (e instanceof MediaUploadError) {
        body =
          e.phase === 'local-read'
            ? t('error.uploadLocalRead')
            : e.phase === 'network'
              ? t('error.uploadNetwork')
              : t('error.uploadS3');
      } else {
        body = t('session.log.uploadFailedRetry');
      }
      Alert.alert(t('session.log.uploadFailed'), body);
    } finally {
      setMediaPhase('idle');
    }
  };

  const endSessionAction = () => {
    if (!session) {
      return;
    }
    endSession.endSession(session.extId).catch(() => {});
  };

  return {
    sessionQuery,
    attemptsQuery,
    endSession,
    session,
    attempts,
    isOngoing,
    logSheetOpen,
    setLogSheetOpen,
    cameraOpen,
    setCameraOpen,
    cameraMode,
    setCameraMode,
    mediaPhase,
    uploadedMediaId,
    setUploadedMediaId,
    openCamera,
    closeCamera,
    onLogSheetDismissed,
    onCameraDismissed,
    handleCaptured,
    endSessionAction,
    videoAwaitingPoster,
    onPosterUploadRequest,
    onPosterModalDismissed,
  };
}
