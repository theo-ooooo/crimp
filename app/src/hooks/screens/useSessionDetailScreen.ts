import { useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { useAttemptsQuery } from '@/hooks/queries/useAttempts';
import { useEndSession, useSessionQuery } from '@/hooks/queries/useSessions';
import { toUserMessage } from '@/lib/api/errorMessage';
import { ApiError } from '@/lib/api/errors';
import type { CapturedMedia } from '@/lib/camera/types';
import { t } from '@/lib/i18n';
import { MediaUploadError, uploadCapturedMedia } from '@/lib/media/upload';
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

  const openCamera = (mode: CameraMode) => {
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
    if (pendingLogReopenRef.current) {
      pendingLogReopenRef.current = false;
      setLogSheetOpen(true);
    }
  };

  const handleCaptured = async (captured: CapturedMedia) => {
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
  };
}
