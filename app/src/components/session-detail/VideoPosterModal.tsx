import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { createThumbnail } from 'react-native-create-thumbnail';

import { PrimaryButton, SecondaryButton } from '@/components/common/primitives';
import type { CapturedMedia } from '@/lib/camera/types';
import { t } from '@/lib/i18n';
import type { Theme } from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';

function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

/**
 * 비디오 길이 기반 후보 시점 비율 (5%, 23%, 41%, 59%, 77%, 95%).
 *
 * <p>0 / duration 끝점은 검은 인트로/아웃트로일 가능성이 커서 양 끝을 살짝 안쪽으로 잡았고,
 * 6개는 4:5 카드를 한 화면에 한 개씩 띄울 때 carousel 페이지 수로 적당하다.
 */
const POSTER_RATIOS = [0.05, 0.23, 0.41, 0.59, 0.77, 0.95];

/** durationMs 가 누락된 영상의 임시 추정값. createThumbnail 이 끝 프레임으로 클램프하므로 작은 손해만. */
const FALLBACK_DURATION_MS = 10_000;

type PosterCandidate = {
  uri: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  timeMs: number;
};

type Props = {
  visible: boolean;
  video: CapturedMedia | null;
  onRequestUpload: (poster: CapturedMedia | null) => void;
  /** iOS 에서 모달 dismiss 애니메이션이 끝난 시점 — 부모가 다음 모달을 시리얼라이즈로 띄울 때 사용. */
  onDismissed?: () => void;
};

/**
 * 동영상 업로드 전 대표 화면(포스터) 선택 — carousel 형태로 후보 6개를 swipe.
 *
 * 흐름:
 * 1. 모달 오픈 시 video 의 길이 기반으로 6개 시점에서 createThumbnail 병렬 호출 → 후보 카드 생성
 * 2. 사용자는 좌우 swipe 로 카드 이동, 현재 인덱스가 자동 선택됨
 * 3. "사용" 시 선택 카드를 CapturedMedia (IMAGE) 로 변환해 onRequestUpload(poster) 호출
 * 4. "건너뛰기" 또는 cancel 시 onRequestUpload(null)
 */
export function VideoPosterModal({
  visible,
  video,
  onRequestUpload,
  onDismissed,
}: Props): JSX.Element | null {
  const theme = useTokens();
  const { width: windowWidth } = useWindowDimensions();
  const cellWidth = useMemo(() => Math.round(windowWidth * 0.7), [windowWidth]);
  const cellGap = 12;
  const sidePadding = useMemo(
    () => Math.max(16, Math.round((windowWidth - cellWidth) / 2)),
    [windowWidth, cellWidth],
  );
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [candidates, setCandidates] = useState<PosterCandidate[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);

  // video 가 바뀌거나 모달이 닫혔다 다시 열릴 때마다 후보 재생성. 이전 모달의 candidates 유출 방지.
  useEffect(() => {
    if (!visible || !video) {
      setCandidates([]);
      setSelectedIndex(0);
      setGenerating(false);
      return;
    }
    let alive = true;
    setGenerating(true);
    setCandidates([]);
    setSelectedIndex(0);

    const durMs = video.durationMs && video.durationMs > 0
      ? video.durationMs
      : FALLBACK_DURATION_MS;

    Promise.all(
      POSTER_RATIOS.map(async (ratio) => {
        const ts = Math.max(0, Math.min(Math.floor(durMs * ratio), durMs - 50));
        const thumb = await createThumbnail({
          url: toFileUri(video.uri),
          timeStamp: ts,
          format: 'jpeg',
          maxWidth: 720,
          maxHeight: 720,
        });
        return {
          uri: toFileUri(thumb.path),
          byteSize: thumb.size ?? 0,
          width: thumb.width ?? null,
          height: thumb.height ?? null,
          timeMs: ts,
        };
      }),
    )
      .then((results) => {
        if (!alive) return;
        const ok = results.filter((c) => c.byteSize > 0);
        setCandidates(ok);
        setSelectedIndex(0);
      })
      .catch((e) => {
        // 한 후보 실패 = 전체 실패. createThumbnail 의 부분 성공 분기는 후속에서.
        // eslint-disable-next-line no-console
        console.warn('[VideoPosterModal] thumbnail batch failed', e);
        if (alive) setCandidates([]);
      })
      .finally(() => {
        if (alive) setGenerating(false);
      });

    return () => {
      alive = false;
    };
  }, [visible, video]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / (cellWidth + cellGap));
      const clamped = Math.max(0, Math.min(idx, candidates.length - 1));
      setSelectedIndex(clamped);
    },
    [cellWidth, candidates.length],
  );

  const confirmPoster = useCallback(() => {
    if (!video) {
      onRequestUpload(null);
      return;
    }
    const picked = candidates[selectedIndex];
    if (!picked) {
      Alert.alert(
        t('session.log.posterErrorTitle'),
        t('session.log.posterErrorBody'),
      );
      return;
    }
    setBusy(true);
    const poster: CapturedMedia = {
      uri: picked.uri,
      mime: 'image/jpeg',
      byteSize: picked.byteSize,
      width: picked.width,
      height: picked.height,
      durationMs: null,
      kind: 'IMAGE',
    };
    onRequestUpload(poster);
  }, [video, candidates, selectedIndex, onRequestUpload]);

  const skip = useCallback(() => {
    onRequestUpload(null);
  }, [onRequestUpload]);

  // RN <Modal> 의 onDismiss 는 Modal 인스턴스가 dismissed 될 때만 호출. 부모 컴포넌트가
  // 조건부 마운트 (`return null`) 로 Modal 을 unmount 시키면 콜백이 누락되어 다음 시리얼라이즈
  // 흐름 (LogAttemptSheet 재오픈) 이 끊긴다. 따라서 Modal 자체는 항상 마운트한 채
  // visible prop 으로 표시 여부만 토글.
  return (
    <Modal
      visible={visible && video != null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={skip}
      onDismiss={onDismissed}
    >
      {video == null ? null : (
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
          {t('session.log.posterTitle')}
        </Text>
        <Text style={[styles.hint, { color: theme.text3 }]}>
          {t('session.log.posterHint')}
        </Text>

        {generating ? (
          <View style={[styles.placeholder, { aspectRatio: 4 / 5 }]}>
            <ActivityIndicator size="large" color={theme.text2} />
            <Text style={[styles.placeholderLabel, { color: theme.text3 }]}>
              {t('session.log.posterWorking')}
            </Text>
          </View>
        ) : candidates.length === 0 ? (
          <View style={[styles.placeholder, { aspectRatio: 4 / 5, backgroundColor: theme.subtle }]}>
            <Text style={[styles.placeholderLabel, { color: theme.text3 }]}>
              {t('session.log.posterErrorBody')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={candidates}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, i) => `${item.timeMs}-${i}`}
            snapToInterval={cellWidth + cellGap}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: sidePadding }}
            ItemSeparatorComponent={() => <View style={{ width: cellGap }} />}
            onMomentumScrollEnd={onMomentumEnd}
            renderItem={({ item, index }) => (
              <Pressable
                onPress={() => setSelectedIndex(index)}
                accessibilityRole="button"
                accessibilityLabel={t('session.log.posterUseFrame')}
                accessibilityState={{ selected: index === selectedIndex }}
                style={[
                  styles.cell,
                  {
                    width: cellWidth,
                    borderColor:
                      index === selectedIndex ? theme.accent.base : 'transparent',
                  },
                ]}
              >
                <Image
                  source={{ uri: item.uri }}
                  style={styles.cellImage}
                  resizeMode="cover"
                />
              </Pressable>
            )}
          />
        )}

        {candidates.length > 1 ? (
          <View style={styles.dots}>
            {candidates.map((c, i) => (
              <View
                key={`${c.timeMs}-${i}`}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i === selectedIndex ? theme.accent.base : theme.hairline,
                  },
                ]}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
          <SecondaryButton
            onPress={skip}
            disabled={busy}
            accessibilityLabel={t('session.log.posterSkip')}
          >
            {t('session.log.posterSkip')}
          </SecondaryButton>
          <PrimaryButton
            onPress={confirmPoster}
            disabled={busy || generating || candidates.length === 0}
            accessibilityLabel={t('session.log.posterUseFrame')}
          >
            {busy
              ? t('session.log.posterWorking')
              : t('session.log.posterUseFrame')}
          </PrimaryButton>
        </View>

        <Pressable
          onPress={skip}
          style={styles.cancelBtn}
          accessibilityRole="button"
          disabled={busy}
        >
          <Text style={[styles.cancelLabel, { color: theme.text3 }]}>
            {t('common.cancel')}
          </Text>
        </Pressable>
      </View>
      )}
    </Modal>
  );
}

function makeStyles(_theme: Theme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      paddingTop: 24,
      paddingBottom: 32,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 8,
      paddingHorizontal: 20,
    },
    hint: {
      fontSize: 14,
      marginBottom: 16,
      lineHeight: 20,
      paddingHorizontal: 20,
    },
    placeholder: {
      marginHorizontal: 20,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    placeholderLabel: {
      fontSize: 13,
    },
    cell: {
      aspectRatio: 4 / 5,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 3,
    },
    cellImage: {
      width: '100%',
      height: '100%',
    },
    dots: {
      marginTop: 12,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    actions: {
      marginTop: 24,
      gap: 12,
      paddingHorizontal: 20,
    },
    cancelBtn: {
      marginTop: 16,
      alignSelf: 'center',
      padding: 8,
    },
    cancelLabel: {
      fontSize: 15,
    },
    // Platform.OS hint — onDismiss 가 iOS-only 라 Android 는 onRequestClose 가 정리.
    _platformAndroid: { display: Platform.OS === 'android' ? 'flex' : 'none' },
  });
}
