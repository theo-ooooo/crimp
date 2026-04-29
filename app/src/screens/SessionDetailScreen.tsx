import { useRoute, type RouteProp } from '@react-navigation/native';
import React, { useMemo } from 'react';
import {
} from 'react-native';

import { AuthHydrationGate } from '@/components/common/screen/AuthHydrationGate';
import { SessionDetailBody } from '@/components/session-detail/SessionDetailBody';
import { makeSessionDetailStyles } from '@/components/session-detail/sessionDetailStyles';
import { useSessionDetailScreen } from '@/hooks/screens/useSessionDetailScreen';
import { useTokens } from '@/lib/useTokens';
import type { RootStackParamList } from '@/navigation/types';
import { useTokenStore } from '@/store/tokenStore';

/**
 * 세션 상세 화면.
 *
 * - 상단 SessionMetaCard (라이브 경과 시간)
 * - 시도 타임라인 (ScrollView 내부 map 렌더 — I2 참고)
 * - 진행 중이면 하단에 "시도 기록" PrimaryButton(시트 토글) + SecondaryButton 세션 종료
 */
export default function SessionDetailScreen(): JSX.Element {
  const theme = useTokens();
  const route = useRoute<RouteProp<RootStackParamList, 'SessionDetail'>>();
  const { extId } = route.params;
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);
  const styles = useMemo(() => makeSessionDetailStyles(theme), [theme]);

  return (
    <AuthHydrationGate
      hydrated={hydrated}
      accessToken={accessToken}
      loginTitleKey="session.detail.loginRequiredTitle"
      loginDescriptionKey="session.detail.loginRequiredDescription"
    >
      {(token) => (
        <SessionDetailLoggedInContainer
          accessToken={token}
          extId={extId}
          styles={styles}
          bgColor={theme.bg}
          textColor={theme.text}
        />
      )}
    </AuthHydrationGate>
  );
}

function SessionDetailLoggedInContainer({
  accessToken,
  extId,
  styles,
  bgColor,
  textColor,
}: {
  accessToken: string;
  extId: string;
  styles: ReturnType<typeof makeSessionDetailStyles>;
  bgColor: string;
  textColor: string;
}): JSX.Element {
  const detail = useSessionDetailScreen(accessToken, extId);

  return (
    <SessionDetailBody
      styles={styles}
      bgColor={bgColor}
      textColor={textColor}
      session={detail.session ?? null}
      attempts={detail.attempts}
      sessionLoading={detail.sessionQuery.isLoading}
      sessionError={detail.sessionQuery.error ?? null}
      attemptsLoading={detail.attemptsQuery.isLoading}
      attemptsError={detail.attemptsQuery.error ?? null}
      isOngoing={detail.isOngoing}
      extId={extId}
      accessToken={accessToken}
      logSheetOpen={detail.logSheetOpen}
      setLogSheetOpen={detail.setLogSheetOpen}
      cameraOpen={detail.cameraOpen}
      cameraMode={detail.cameraMode}
      onCameraMode={(mode) => {
        detail.setCameraMode(mode);
        detail.setCameraOpen(true);
      }}
      closeCamera={detail.closeCamera}
      onCaptured={detail.handleCaptured}
      uploading={detail.uploading}
      uploadedMediaId={detail.uploadedMediaId}
      onClearMedia={() => detail.setUploadedMediaId(null)}
      onEndSession={detail.endSessionAction}
      endPending={detail.endSession.isPending}
      endError={detail.endSession.error ?? null}
    />
  );
}
