import { useRoute, type RouteProp } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PrimaryButton, SecondaryButton, Skeleton } from '@/components/primitives';
import {
  CameraSheet,
  LogAttemptSheet,
  type CameraMode,
} from '@/components/session';
import { useAttemptsQuery } from '@/hooks/useAttempts';
import { useEndSession, useSessionQuery } from '@/hooks/useSessions';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontWeight,
  radius,
  space,
  type Theme,
} from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';
import type { RootStackParamList } from '@/navigation/types';
import type { Attempt } from '@/lib/schemas/attempt';
import { useTokenStore } from '@/store/tokenStore';

import { AttemptRow } from './session/AttemptRow';
import { SessionMetaCard } from './session/SessionMetaCard';

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

  const sessionQuery = useSessionQuery(accessToken, extId);
  const attemptsQuery = useAttemptsQuery(accessToken, extId);
  const endSession = useEndSession(accessToken);

  // 시도 기록 시트 / 카메라 시트 상태. 카메라는 시트 위 시트로 동시에 열려도 무관.
  const [logSheetOpen, setLogSheetOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('video');

  const closeCamera = () => {
    setCameraOpen(false);
  };

  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!hydrated) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={styles.muted}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!accessToken) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={styles.heading}>
          {t('session.detail.loginRequiredTitle')}
        </Text>
        <Text style={styles.muted}>
          {t('session.detail.loginRequiredDescription')}
        </Text>
      </View>
    );
  }

  const session = sessionQuery.data;
  const attempts: Attempt[] = attemptsQuery.data?.items ?? [];
  const isOngoing = session ? !session.endedAt : false;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {sessionQuery.isLoading ? (
        <Skeleton height={180} radius={radius.xl} />
      ) : sessionQuery.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>
            {t('session.detail.errorTitle')}
          </Text>
          <Text style={styles.errorBody}>
            {toUserMessage(sessionQuery.error)}
          </Text>
        </View>
      ) : session ? (
        <SessionMetaCard session={session} />
      ) : null}

      <View style={styles.timelineHeader}>
        <Text style={styles.sectionTitle}>
          {t('session.detail.attemptsTitle')}
        </Text>
        <Text style={styles.sectionCount}>{attempts.length}</Text>
      </View>

      {attemptsQuery.isLoading ? (
        <View style={styles.timelineList}>
          <Skeleton height={64} radius={radius.lg} />
          <Skeleton height={64} radius={radius.lg} />
          <Skeleton height={64} radius={radius.lg} />
        </View>
      ) : attemptsQuery.error ? (
        // I3: session 에러 블록과 동일한 errorBox 스타일로 통일
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>
            {t('session.detail.errorTitle')}
          </Text>
          <Text style={styles.errorBody}>
            {toUserMessage(attemptsQuery.error)}
          </Text>
        </View>
      ) : attempts.length > 0 ? (
        // I2 (Option A): ScrollView 내부에서 FlatList + scrollEnabled=false 하면
        // 가상화 이점이 사라지고 VirtualizedLists 경고가 뜸. MVP 규모상 일반 map 렌더로 충분.
        // 세션당 시도 수가 수백 단위로 늘어나면 Option B (루트 FlatList + ListHeaderComponent) 로 전환 필요.
        <View style={styles.timelineList}>
          {attempts.map((a) => (
            <AttemptRow key={a.extId} attempt={a} />
          ))}
        </View>
      ) : (
        <Text style={styles.muted}>{t('session.detail.attemptsEmpty')}</Text>
      )}

      {isOngoing && session ? (
        <>
          <View style={styles.logCtaWrap}>
            <PrimaryButton
              onPress={() => setLogSheetOpen(true)}
              accessibilityLabel={t('session.log.openCta')}
            >
              {t('session.log.openCta')}
            </PrimaryButton>
          </View>
          <View style={styles.endWrap}>
            <SecondaryButton
              onPress={() => {
                endSession.endSession(session.extId).catch(() => {
                  /* endSession.error 로 노출 */
                });
              }}
              disabled={endSession.isPending}
            >
              {endSession.isPending
                ? t('session.detail.ending')
                : t('session.detail.endButton')}
            </SecondaryButton>
            {endSession.error ? (
              <Text style={styles.errorTitle}>
                {toUserMessage(endSession.error)}
              </Text>
            ) : null}
          </View>

          <LogAttemptSheet
            visible={logSheetOpen}
            accessToken={accessToken}
            sessionExtId={extId}
            onClose={() => setLogSheetOpen(false)}
            onCamera={(mode) => {
              setCameraMode(mode);
              setCameraOpen(true);
            }}
          />
          <CameraSheet
            visible={cameraOpen}
            mode={cameraMode}
            onClose={closeCamera}
            onCaptured={(media) => {
              // TODO(PR-3): 본 media 로 presigned 업로드 → mediaId 를 LogAttemptSheet 로 전달.
              // 현 단계는 캡처 동작 자체만 검증 — 메타 + URI 를 Alert 으로 노출.
              const detail =
                media.kind === 'IMAGE'
                  ? `${media.kind} · ${media.byteSize}b · ${media.width}x${media.height}\n${media.uri}`
                  : `${media.kind} · ${media.byteSize}b · ${media.durationMs}ms\n${media.uri}`;
              Alert.alert(t('session.log.cameraCapturedTitle'), detail);
              closeCamera();
            }}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: {
      padding: space[5],
      paddingBottom: space[10],
      gap: space[5],
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space[6],
      gap: space[2],
    },
    heading: {
      fontFamily,
      fontSize: 18,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    muted: {
      fontFamily,
      fontSize: 14,
      color: theme.text3,
      textAlign: 'center',
    },
    sectionTitle: {
      fontFamily,
      fontSize: 18,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: -0.36,
    },
    sectionCount: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    timelineHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    timelineList: {
      gap: space[2],
    },
    errorBox: {
      backgroundColor: `${theme.semantic.danger}14`,
      borderRadius: radius.lg,
      padding: space[4],
      gap: space[1],
    },
    errorTitle: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
    },
    errorBody: {
      fontFamily,
      fontSize: 13,
      color: theme.text2,
    },
    endWrap: {
      gap: space[2],
      alignItems: 'stretch',
    },
    logCtaWrap: {
      alignItems: 'stretch',
    },
  });
}
