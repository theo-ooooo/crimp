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
import { makeSessionDetailStyles } from './sessionDetailStyles';
import type { CapturedMedia } from '@/lib/camera/types';

type Props = {
  styles: ReturnType<typeof makeSessionDetailStyles>;
  bgColor: string;
  textColor: string;
  session: Session | null;
  attempts: Attempt[];
  sessionLoading: boolean;
  sessionError: Error | null;
  attemptsLoading: boolean;
  attemptsError: Error | null;
  isOngoing: boolean;
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
  mediaPhase: 'idle' | 'compressing' | 'uploading';
  uploadedMediaId: number | null;
  onClearMedia: () => void;
  onEndSession: () => void;
  endPending: boolean;
  endError: Error | null;
};

export function SessionDetailBody(props: Props): JSX.Element {
  const {
    styles,
    bgColor,
    textColor,
    session,
    attempts,
    sessionLoading,
    sessionError,
    attemptsLoading,
    attemptsError,
    isOngoing,
    extId,
    accessToken,
    logSheetOpen,
    setLogSheetOpen,
    cameraOpen,
    cameraMode,
    onCameraMode,
    closeCamera,
    onLogSheetDismissed,
    onCameraDismissed,
    onCaptured,
    mediaPhase,
    uploadedMediaId,
    onClearMedia,
    onEndSession,
    endPending,
    endError,
  } = props;
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bgColor }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {sessionLoading ? (
        <Skeleton height={180} radius={radius.xl} />
      ) : sessionError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t('session.detail.errorTitle')}</Text>
          <Text style={styles.errorBody}>{toUserMessage(sessionError)}</Text>
        </View>
      ) : session ? (
        <SessionMetaCard session={session} />
      ) : null}

      <View style={styles.timelineHeader}>
        <Text style={styles.sectionTitle}>{t('session.detail.attemptsTitle')}</Text>
        <Text style={styles.sectionCount}>{attempts.length}</Text>
      </View>

      {attemptsLoading ? (
        <View style={styles.timelineList}>
          <Skeleton height={64} radius={radius.lg} />
          <Skeleton height={64} radius={radius.lg} />
          <Skeleton height={64} radius={radius.lg} />
        </View>
      ) : attemptsError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t('session.detail.errorTitle')}</Text>
          <Text style={styles.errorBody}>{toUserMessage(attemptsError)}</Text>
        </View>
      ) : attempts.length > 0 ? (
        <View style={styles.timelineList}>
          {attempts.map((a) => (
            <AttemptRow key={a.extId} attempt={a} />
          ))}
        </View>
      ) : (
        <Text style={styles.errorBody}>{t('session.detail.attemptsEmpty')}</Text>
      )}

      {isOngoing && session ? (
        <>
          <View style={styles.logCtaWrap}>
            <PrimaryButton onPress={() => setLogSheetOpen(true)} accessibilityLabel={t('session.log.openCta')}>
              {t('session.log.openCta')}
            </PrimaryButton>
          </View>
          <View style={styles.endWrap}>
            <SecondaryButton onPress={onEndSession} disabled={endPending}>
              {endPending ? t('session.detail.ending') : t('session.detail.endButton')}
            </SecondaryButton>
            {endError ? <Text style={styles.errorTitle}>{toUserMessage(endError)}</Text> : null}
          </View>

          <LogAttemptSheet
            visible={logSheetOpen}
            accessToken={accessToken}
            sessionExtId={extId}
            onClose={() => setLogSheetOpen(false)}
            onDismissed={onLogSheetDismissed}
            onCamera={(mode) => onCameraMode(mode)}
            attachedMediaId={uploadedMediaId}
            mediaPhase={mediaPhase}
            onClearMedia={onClearMedia}
          />
          <CameraSheet
            visible={cameraOpen}
            mode={cameraMode}
            onClose={closeCamera}
            onDismissed={onCameraDismissed}
            onCaptured={onCaptured}
          />
          {/* (PR #115 후속) 업로드 진행 표시는 LogAttemptSheet 안의 인라인 spinner 로 통합.
              여기서 별 <Modal> 을 띄우면 LogAttemptSheet Modal 위 nested 라 iOS 가 가려
              사용자가 '아무 반응 없음' 으로 인지하던 회귀 차단. */}
        </>
      ) : null}
    </ScrollView>
  );
}
