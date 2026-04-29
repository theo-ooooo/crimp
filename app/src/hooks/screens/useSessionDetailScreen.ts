import { useState } from 'react';
import { Alert } from 'react-native';

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
  const [uploading, setUploading] = useState(false);
  const [uploadedMediaId, setUploadedMediaId] = useState<number | null>(null);

  const session = sessionQuery.data;
  const attempts: Attempt[] = attemptsQuery.data?.items ?? [];
  const isOngoing = session ? !session.endedAt : false;

  const closeCamera = () => {
    setCameraOpen(false);
  };

  const handleCaptured = async (captured: CapturedMedia) => {
    closeCamera();
    setUploading(true);
    try {
      const completed = await uploadCapturedMedia(accessToken, captured);
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
      setUploading(false);
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
    uploading,
    uploadedMediaId,
    setUploadedMediaId,
    closeCamera,
    handleCaptured,
    endSessionAction,
  };
}
