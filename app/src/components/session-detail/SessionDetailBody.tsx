import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { PrimaryButton, SecondaryButton, Skeleton } from '@/components/common/primitives';
import { CameraSheet, LogAttemptSheet, type CameraMode } from '@/components/common/session';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import { radius } from '@/lib/tokens';
import type { Attempt } from '@/lib/schemas/attempt';
import type { Session } from '@/lib/schemas/session';

import { AttemptRow } from '@/components/session-detail/AttemptRow';
import { SessionMetaCard } from '@/components/session-detail/SessionMetaCard';
import { VideoPosterModal } from '@/components/session-detail/VideoPosterModal';
import { makeSessionDetailStyles } from './sessionDetailStyles';
import type { CapturedMedia } from '@/lib/camera/types';

type Props = {
  styles: ReturnType<typeof makeSessionDetailStyles>;
  bgColor: string;
  sessionState: SessionDetailSessionState;
  attemptsState: SessionDetailAttemptsState;
  logFlow: SessionDetailLogFlow;
};

export type SessionDetailSessionState = {
  session: Session | null;
  loading: boolean;
  error: Error | null;
  isOngoing: boolean;
  onEnd: () => void;
  endPending: boolean;
  endError: Error | null;
};

export type SessionDetailAttemptsState = {
  attempts: Attempt[];
  loading: boolean;
  error: Error | null;
};

export type SessionDetailLogFlow = {
  extId: string;
  accessToken: string;
  logSheetOpen: boolean;
  setLogSheetOpen: (open: boolean) => void;
  cameraOpen: boolean;
  cameraMode: CameraMode;
  onCameraMode: (mode: CameraMode) => void;
  closeCamera: () => void;
  onLogSheetDismissed: () => void;
  onCameraDismissed: () => void;
  onCaptured: (captured: CapturedMedia) => Promise<void>;
  videoAwaitingPoster: CapturedMedia | null;
  onPosterUploadRequest: (poster: CapturedMedia | null) => void;
  onPosterModalDismissed: () => void;
  mediaPhase: 'idle' | 'compressing' | 'uploading';
  uploadedMediaId: number | null;
  mediaUploadError: string | null;
  onRetryMediaUpload: () => void;
  onClearMedia: () => void;
};

export function SessionDetailBody(props: Props): JSX.Element {
  const {
    styles,
    bgColor,
    sessionState,
    attemptsState,
    logFlow,
  } = props;
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bgColor }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {sessionState.loading ? (
        <Skeleton height={180} radius={radius.xl} />
      ) : sessionState.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t('session.detail.errorTitle')}</Text>
          <Text style={styles.errorBody}>{toUserMessage(sessionState.error)}</Text>
        </View>
      ) : sessionState.session ? (
        <SessionMetaCard session={sessionState.session} />
      ) : null}

      <View style={styles.timelineHeader}>
        <Text style={styles.sectionTitle}>{t('session.detail.attemptsTitle')}</Text>
        <Text style={styles.sectionCount}>{attemptsState.attempts.length}</Text>
      </View>

      {attemptsState.loading ? (
        <View style={styles.timelineList}>
          <Skeleton height={64} radius={radius.lg} />
          <Skeleton height={64} radius={radius.lg} />
          <Skeleton height={64} radius={radius.lg} />
        </View>
      ) : attemptsState.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t('session.detail.errorTitle')}</Text>
          <Text style={styles.errorBody}>{toUserMessage(attemptsState.error)}</Text>
        </View>
      ) : attemptsState.attempts.length > 0 ? (
        <View style={styles.timelineList}>
          {attemptsState.attempts.map((a) => (
            <AttemptRow key={a.extId} attempt={a} />
          ))}
        </View>
      ) : (
        <Text style={styles.errorBody}>{t('session.detail.attemptsEmpty')}</Text>
      )}

      {sessionState.isOngoing && sessionState.session ? (
        <>
          <View style={styles.logCtaWrap}>
            <PrimaryButton
              onPress={() => logFlow.setLogSheetOpen(true)}
              accessibilityLabel={t('session.log.openCta')}
            >
              {t('session.log.openCta')}
            </PrimaryButton>
          </View>
          <View style={styles.endWrap}>
            <SecondaryButton onPress={sessionState.onEnd} disabled={sessionState.endPending}>
              {sessionState.endPending ? t('session.detail.ending') : t('session.detail.endButton')}
            </SecondaryButton>
            {sessionState.endError ? (
              <Text style={styles.errorTitle}>{toUserMessage(sessionState.endError)}</Text>
            ) : null}
          </View>

          <LogAttemptSheet
            visible={logFlow.logSheetOpen}
            accessToken={logFlow.accessToken}
            sessionExtId={logFlow.extId}
            onClose={() => logFlow.setLogSheetOpen(false)}
            onDismissed={logFlow.onLogSheetDismissed}
            onCamera={(mode) => logFlow.onCameraMode(mode)}
            attachedMediaId={logFlow.uploadedMediaId}
            mediaPhase={logFlow.mediaPhase}
            mediaUploadError={logFlow.mediaUploadError}
            onRetryMediaUpload={logFlow.onRetryMediaUpload}
            onClearMedia={logFlow.onClearMedia}
          />
          <CameraSheet
            visible={logFlow.cameraOpen}
            mode={logFlow.cameraMode}
            onClose={logFlow.closeCamera}
            onDismissed={logFlow.onCameraDismissed}
            onCaptured={logFlow.onCaptured}
          />
          <VideoPosterModal
            visible={logFlow.videoAwaitingPoster !== null}
            video={logFlow.videoAwaitingPoster}
            onRequestUpload={logFlow.onPosterUploadRequest}
            onDismissed={logFlow.onPosterModalDismissed}
          />
          {/* (PR #115 후속) 업로드 진행 표시는 LogAttemptSheet 안의 인라인 spinner 로 통합.
              여기서 별 <Modal> 을 띄우면 LogAttemptSheet Modal 위 nested 라 iOS 가 가려
              사용자가 '아무 반응 없음' 으로 인지하던 회귀 차단. */}
        </>
      ) : null}
    </ScrollView>
  );
}
