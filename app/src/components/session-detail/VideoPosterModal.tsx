import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { createThumbnail } from 'react-native-create-thumbnail';
import RNFS from 'react-native-fs';

import { PrimaryButton, SecondaryButton } from '@/components/common/primitives';
import type { CapturedMedia } from '@/lib/camera/types';
import { t } from '@/lib/i18n';
import type { Theme } from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';

function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

/**
 * 비디오 길이 기반 후보 시점 비율.
 *
 * <p>일반 케이스 6개 (5%, 23%, 41%, 59%, 77%, 95%) — 0/끝 검은 인트로/아웃트로 회피 + 4:5
 * 카드 carousel 페이지 수 적당.
 *
 * <p>큰 영상 (60s+) 은 디코더 메모리 부담 + 모달 latency 를 줄이기 위해 3개 (15%, 50%, 85%)
 * 만 생성. createThumbnail 의 메모리 spike 가 큰 mp4 에서 OOM 가능성 ↑.
 */
const POSTER_RATIOS_FULL = [0.05, 0.23, 0.41, 0.59, 0.77, 0.95];
const POSTER_RATIOS_LARGE = [0.15, 0.5, 0.85];
const LARGE_VIDEO_THRESHOLD_MS = 60_000;

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
 * 미선택 후보 thumbnail 파일 unlink (best-effort).
 *
 * <p>createThumbnail 결과는 OS temp 에 저장되며 OS 의 disk pressure 까지 잔존. 사용자가
 * "건너뛰기" 또는 다른 시점 선택 시 미사용 5장이 누적되는 것을 방지. 실패 무시 — temp 는
 * 어차피 OS 가 정리.
 */
async function unlinkCandidates(uris: string[]): Promise<void> {
  await Promise.allSettled(
    uris.map((uri) => {
      const path = uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
      return RNFS.unlink(path).catch(() => undefined);
    }),
  );
}

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
  const flatListRef = useRef<FlatList<PosterCandidate>>(null);

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
    // [PR #123 리뷰 V-F3] 60s+ 비디오는 디코더 메모리 spike 회피를 위해 후보 3개로 축소.
    const ratios = durMs >= LARGE_VIDEO_THRESHOLD_MS
      ? POSTER_RATIOS_LARGE
      : POSTER_RATIOS_FULL;

    const generate = async (): Promise<PosterCandidate[]> => {
      // [PR #123 리뷰 I2] Promise.all 6병렬 → 직렬 reduce. iOS 큰 mp4 디코더 동시 호출 시
      // 메모리 spike + 발열. 직렬은 레이턴시 ~1.5x 증가하지만 안정성 우선.
      // [PR #123 리뷰 I3] 단일 후보 실패가 전체 실패로 전염되지 않도록 try/catch 로 감싸서
      // 부분 성공 허용. 한 시점이 검은 프레임이라 reject 되어도 나머지는 살림.
      const results: PosterCandidate[] = [];
      for (const ratio of ratios) {
        if (!alive) return results;
        const ts = Math.max(0, Math.min(Math.floor(durMs * ratio), durMs - 50));
        try {
          const thumb = await createThumbnail({
            url: toFileUri(video.uri),
            timeStamp: ts,
            format: 'jpeg',
            maxWidth: 720,
            maxHeight: 720,
          });
          if (thumb.size && thumb.size > 0) {
            results.push({
              uri: toFileUri(thumb.path),
              byteSize: thumb.size,
              width: thumb.width ?? null,
              height: thumb.height ?? null,
              timeMs: ts,
            });
          }
        } catch (e) {
          // [PR #123 Codex C3] 단일 후보 실패의 원인을 식별 가능하게 ts + message 명시.
          // eslint-disable-next-line no-console
          console.warn(
            '[VideoPosterModal] thumbnail failed',
            'ratio=' + ratio,
            'ts=' + ts + 'ms',
            e instanceof Error ? e.message : String(e),
          );
        }
      }
      return results;
    };

    generate()
      .then((ok) => {
        if (!alive) return;
        setCandidates(ok);
        setSelectedIndex(0);
      })
      .catch((e) => {
        // generate 내부에서 try/catch 로 감쌌으므로 여기로 오는 건 RNFS 등 외 예외.
        // eslint-disable-next-line no-console
        console.warn(
          '[VideoPosterModal] thumbnail batch unexpected error',
          e instanceof Error ? e.message : String(e),
        );
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

  // [PR #123 리뷰 I6] 카드 탭 시 carousel 도 같이 스크롤 — accent border 만 점프하고 화면
  // 중앙 카드는 다른 게 보이는 시각 부조화 차단.
  const onTilePress = useCallback((index: number) => {
    setSelectedIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  }, []);

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
    // [PR #123 리뷰 I4] 미선택 후보 unlink — 사용자가 선택한 thumbnail 만 남김.
    const unused = candidates.filter((_, i) => i !== selectedIndex).map((c) => c.uri);
    unlinkCandidates(unused).catch(() => {});
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
    // [PR #123 리뷰 I4] 건너뛰기/취소 시 모든 후보 unlink — 사용 안 함.
    if (candidates.length > 0) {
      unlinkCandidates(candidates.map((c) => c.uri)).catch(() => {});
    }
    onRequestUpload(null);
  }, [candidates, onRequestUpload]);

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
            ref={flatListRef}
            data={candidates}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, i) => `${item.timeMs}-${i}`}
            snapToInterval={cellWidth + cellGap}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: sidePadding }}
            ItemSeparatorComponent={() => <View style={{ width: cellGap }} />}
            onMomentumScrollEnd={onMomentumEnd}
            getItemLayout={(_, index) => ({
              length: cellWidth + cellGap,
              offset: (cellWidth + cellGap) * index,
              index,
            })}
            renderItem={({ item, index }) => (
              <Pressable
                onPress={() => onTilePress(index)}
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
  });
}
