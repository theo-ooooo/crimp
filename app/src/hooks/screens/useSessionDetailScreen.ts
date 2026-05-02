import { useState } from 'react';
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

  // (PR-A2) iOS 의 RCTModalHostViewController 는 이미 표시 중인 modal 위에 또 다른 modal 을
  // present 하면 'already presenting' 에러를 던진다. LogAttemptSheet 와 CameraSheet 둘 다
  // RN <Modal> 이라 동시에 visible=true 가 되면 충돌. 카메라 진입/이탈 시 log sheet 와
  // 시리얼라이즈 — 한 쪽이 닫힌 뒤 RN slide 애니메이션 (~300ms) 이 끝나는 시점 후 반대편 open.
  // Android 는 nested Modal 허용하지만 일관성 위해 같은 흐름 사용.
  const SHEET_TRANSITION_MS = Platform.OS === 'ios' ? 350 : 0;

  const openCamera = (mode: CameraMode) => {
    setCameraMode(mode);
    if (logSheetOpen) {
      setLogSheetOpen(false);
      setTimeout(() => setCameraOpen(true), SHEET_TRANSITION_MS);
    } else {
      setCameraOpen(true);
    }
  };

  const closeCamera = () => {
    setCameraOpen(false);
    // 카메라 취소 시 log sheet 으로 복귀 — 사용자가 미디어 없이도 시도 기록을 마저 남길 수 있게.
    setTimeout(() => setLogSheetOpen(true), SHEET_TRANSITION_MS);
  };

  const handleCaptured = async (captured: CapturedMedia) => {
    setCameraOpen(false);
    // 캡처 성공 — log sheet 으로 복귀. 압축·업로드는 백그라운드 진행, mediaPhase 로 표시.
    setTimeout(() => setLogSheetOpen(true), SHEET_TRANSITION_MS);
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
    handleCaptured,
    endSessionAction,
  };
}
