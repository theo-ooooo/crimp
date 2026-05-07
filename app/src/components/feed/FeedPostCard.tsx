import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableStateCallbackType,
  type ViewStyle,
} from 'react-native';
import Video from 'react-native-video';

import {
  CrimpIcon,
  GradeBadge,
  HoldDot,
  ResultMark,
} from '@/components/common/primitives';
import { useLikeToggleMutation } from '@/hooks/queries/useLikeToggle';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontWeight,
  letterSpacing,
  radius,
  space,
  type Theme,
} from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';
import type { AttemptResult } from '@/lib/schemas/attempt';
import type { FeedItem } from '@/lib/schemas/feed';

/**
 * 피드 카드 1개.
 *
 * 디자인 출처: docs/design/claude/v2/screens-ios-2.jsx:482-538
 *
 * 레이아웃:
 *  ┌──────────────────────────────────────────────┐
 *  │ [Avatar 36] nickname                       [Mark]│
 *  │              time · gym                          │
 *  │ [GradeBadge] [HoldDot] result                    │
 *  │ note (lineHeight 1.5)                            │
 *  │ ───────────────────────────────                  │
 *  │ ♡ 24    ▢ 6                                       │
 *  └──────────────────────────────────────────────┘
 *
 * - 카드는 hairline 테두리 1px, radius 18, padding 16.
 * - margin 은 화면 컨테이너에서 처리 (FlatList contentContainerStyle).
 * - nullable 필드 (gymName / gradeValue / holdColor / note) 는 각각 자리 자체를 숨겨
 *   카드 높이가 줄어들도록 한다.
 */

const TABULAR_NUMS = Platform.select<Array<'tabular-nums'>>({
  ios: ['tabular-nums'],
  android: [],
  default: [],
}) as Array<'tabular-nums'>;

export type FeedPostCardProps = {
  item: FeedItem;
  /**
   * 좋아요 토글에 사용할 accessToken. 비로그인이면 null — 그 경우 좋아요 Pressable 은
   * disabled 처리되고 mutation 이 실행되지 않는다.
   */
  accessToken?: string | null;
  /**
   * 댓글 셀 탭 시 호출. 부모(FeedScreen)가 CommentSheet 를 열도록 한다.
   * 미지정이면 셀이 정적으로 렌더된다(현재 화면 디자인과 동일).
   */
  onCommentPress?: (postExtId: string) => void;
};

/**
 * `avatarColorHue` (0~359) → HSL 문자열로 변환.
 *
 * 백엔드는 작성자별 결정성 매핑 `(userId*70+180)%360` 으로 hue 를 내려준다 (PR #53).
 * 모크는 oklch(82% 0.06 hue) 였지만 React Native StyleSheet 가 oklch 를 받지 못하므로
 * 시각적으로 가장 근사한 HSL `hsl(<hue>, 60%, 80%)` 를 사용한다.
 */
function hueToBg(hue: number): string {
  return `hsl(${hue}, 60%, 80%)`;
}

/**
 * loggedAt(ISO) → 사람이 읽는 짧은 표현.
 *
 * - <1분: "방금"
 * - <60분: "{m}분 전"
 * - <24시간: "{h}시간 전"
 * - 그 외: 로컬 짧은 날짜 (ex. "04-25")
 *
 * TODO: `lib/time.ts` 로 추출 — 다음 화면(MySessions/SessionDetail) 에서 동일/유사
 *   포맷이 또 필요해질 때. 지금은 Feed 만 사용하므로 로컬 유지. 통합 시 web 의
 *   `relativeTime.ts` 와 placeholder 규약(`{{n}}` 통일) 도 함께 정리.
 */
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) {
    return t('feed.time.justNow');
  }
  if (diffMin < 60) {
    return t('feed.time.minutesAgo').replace('{{m}}', String(diffMin));
  }
  if (diffMs < ONE_DAY_MS) {
    const diffHour = Math.floor(diffMin / 60);
    return t('feed.time.hoursAgo').replace('{{h}}', String(diffHour));
  }
  // 24시간 이상은 짧은 월-일 표시. 로컬화는 toLocaleDateString 에 위임.
  try {
    return d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
  } catch {
    return d.toISOString().slice(5, 10);
  }
}

export function FeedPostCard({
  item,
  accessToken,
  onCommentPress,
}: FeedPostCardProps): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const likeMutation = useLikeToggleMutation(accessToken ?? null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const avatarBg = hueToBg(item.avatarColorHue);
  // F4: surrogate pair (예: 이모지 닉네임) 를 안전하게 첫 글리프 추출.
  // `.slice(0, 1)` 은 UTF-16 코드 유닛 1개라 surrogate pair 가 깨질 수 있다.
  const avatarChar = Array.from(item.userNickname)[0] ?? '';
  const timeText = formatTimeShort(item.loggedAt);
  const subtitle = item.gymName ? `${timeText} · ${item.gymName}` : timeText;
  const result = item.result as AttemptResult;
  const resultLabel = t(`attempt.result.${result}` as const);

  const grade = item.gradeValue?.trim();
  // holdColor 는 백엔드가 자유 문자열을 줄 수도 있어 theme.hold 키가 아닐 수 있다.
  // 그 경우 HoldDot 의 raw color fallback 에 의지한다 (HoldDot.resolveColor 참고).
  const showHold = Boolean(item.holdColor);

  // 카드 전체 a11y 라벨 — Pressable 자식이 추가되면 RN 이 자식의 role/label 을 따로
  // 노출하므로 (`accessible=false` 부모) 카드 자체는 이제 정적 라벨만 갖는다.
  // 좋아요/댓글은 각 Pressable 의 a11y 로 노출됨.
  const a11yParts: string[] = [
    item.userNickname,
    resultLabel,
    grade ?? null,
    item.gymName ?? null,
    timeText,
    item.note ?? null,
  ].filter((s): s is string => Boolean(s));
  const a11yLabel = a11yParts.join(', ');

  const onLikePress = () => {
    // 비로그인 또는 진행 중이면 무시. accessToken 부재는 Pressable disabled 로도 막힘.
    if (!accessToken || likeMutation.isPending) {return;}
    likeMutation.mutate(
      { postExtId: item.extId, next: !item.liked },
      {
        // I2: 401/실패 시 silent rollback 만 하면 사용자가 변화를 인지 못함.
        // 토스트 시스템이 도입되기 전까지 Alert 로 명시. (TODO: 글로벌 toast → Alert 교체.)
        onError: (err) => {
          Alert.alert(t('feed.errorTitle'), toUserMessage(err));
        },
      },
    );
  };

  const onCommentCellPress = () => {
    if (onCommentPress) {onCommentPress(item.extId);}
  };

  const heartColor = item.liked ? theme.semantic.danger : theme.text2;

  useEffect(() => {
    setAvatarFailed(false);
  }, [item.avatarUrl]);

  return (
    <View
      style={styles.card}
      accessibilityLabel={a11yLabel}
    >
      {/* 헤더: 아바타 · 닉네임/메타 · ResultMark */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          {item.avatarUrl && !avatarFailed ? (
            <Image
              source={{ uri: item.avatarUrl }}
              style={styles.avatarImage}
              onError={() => setAvatarFailed(true)}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Text style={styles.avatarChar} allowFontScaling={false}>
              {avatarChar}
            </Text>
          )}
        </View>
        <View style={styles.headerBody}>
          <Text style={styles.nickname} numberOfLines={1}>
            {item.userNickname}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <ResultMark kind={result} size={26} />
      </View>

      {/* 메타: GradeBadge · HoldDot · 결과 라벨 */}
      {(grade || showHold) ? (
        <View style={styles.metaRow}>
          {grade ? <GradeBadge v={grade} size="md" /> : null}
          {showHold && item.holdColor ? (
            // HoldDot 은 theme.hold 키 또는 raw color 문자열 모두 허용 (resolveColor 폴백).
            // 백엔드가 임의 문자열을 보내도 안전.
            <HoldDot color={item.holdColor} size={14} />
          ) : null}
          <Text style={styles.kindLabel} numberOfLines={1}>
            {resultLabel}
          </Text>
        </View>
      ) : null}

      {/* 본문 */}
      {item.note ? (
        <Text style={styles.note}>{item.note}</Text>
      ) : null}

      {/* (PR-F3) 미디어 — 비디오는 풀스크린 모달 재생, 이미지는 정적 표시 (lightbox 후속). */}
      {item.mediaUrls.length > 0 ? (
        <FeedCardMedia mediaUrls={item.mediaUrls} styles={styles} />
      ) : null}

      {/* 푸터: 좋아요 / 댓글 */}
      <View style={styles.footer}>
        <Pressable
          onPress={onLikePress}
          disabled={!accessToken || likeMutation.isPending}
          accessibilityRole="button"
          accessibilityState={{
            selected: item.liked,
            disabled: !accessToken || likeMutation.isPending,
          }}
          accessibilityLabel={`${
            item.liked
              ? t('feed.card.likeAriaPressed')
              : t('feed.card.likeAriaUnpressed')
          }, ${item.likes}`}
          // 셀 자체가 16+카운트 정도라 작다. 위·아래 8 / 좌우 6 hitSlop 으로 권고치 보강.
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          style={pressableFooterStyle}
        >
          <View style={styles.footerCell}>
            <CrimpIcon.heart size={16} color={heartColor} fill={item.liked} />
            <Text
              style={[
                styles.footerCount,
                item.liked ? { color: theme.semantic.danger } : null,
              ]}
              allowFontScaling={false}
            >
              {item.likes}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={onCommentCellPress}
          disabled={!onCommentPress}
          accessibilityRole="button"
          accessibilityLabel={`${t('feed.card.commentsAria')}, ${item.comments}`}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          style={pressableFooterStyle}
        >
          <View style={styles.footerCell}>
            <CrimpIcon.chat size={16} color={theme.text2} />
            <Text style={styles.footerCount} allowFontScaling={false}>
              {item.comments}
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

// 푸터 Pressable 의 pressed 시각 피드백 — 라이트/다크 공통.
function pressableFooterStyle({
  pressed,
}: PressableStateCallbackType): ViewStyle {
  return pressed ? { opacity: 0.6 } : {};
}

/**
 * (PR-F3) 피드 카드 미디어 — RN 측.
 *
 * - 단일: 카드 가득찬 4:5 이미지/비디오 썸네일.
 * - 다중: 가로 FlatList (snap pagingEnabled). 카드 폭 280pt 씩.
 * - 비디오 탭 → 풀스크린 Modal 의 react-native-video 로 재생.
 *
 * 모달은 카드별 useState 로 보유하지만, 빠른 연속 탭 시 iOS 의 "already presenting"
 * 거절을 막기 위해 모듈 스코프 락 (videoModalLock) 으로 동시에 열리지 않도록 1차 가드.
 * 단일 모달 매니저로의 전면 리팩토링은 별도 PR (F5 후속).
 */
let videoModalLock = false;

function FeedCardMedia({
  mediaUrls,
  styles,
}: {
  mediaUrls: FeedItem['mediaUrls'];
  styles: ReturnType<typeof makeStyles>;
}): JSX.Element {
  // 풀스크린 비디오 재생용 — 카드 단위에서 한 번에 한 개만 재생.
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const closeVideo = () => {
    videoModalLock = false;
    setActiveVideo(null);
  };

  const onTilePress = (m: FeedItem['mediaUrls'][number]) => {
    if (m.kind === 'VIDEO') {
      // 다른 카드의 모달이 열려있는 중이면 무시 — iOS 동시 present 거절 회피.
      if (videoModalLock) {
        return;
      }
      videoModalLock = true;
      setActiveVideo(m.url);
    }
    // 이미지 lightbox 는 후속 — 현재는 탭 무동작.
  };

  const single = mediaUrls.length === 1;
  const Body =
    single && mediaUrls[0] ? (
      <View style={styles.mediaSingle}>
        <FeedMediaTile media={mediaUrls[0]} styles={styles} onPress={onTilePress} />
      </View>
    ) : (
      <FlatList
        data={mediaUrls}
        keyExtractor={(m, i) => `${m.url}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.mediaListContent}
        renderItem={({ item: m }) => (
          <View style={styles.mediaMultiCell}>
            <FeedMediaTile media={m} styles={styles} onPress={onTilePress} />
          </View>
        )}
      />
    );

  return (
    <>
      {Body}
      <Modal
        visible={activeVideo !== null}
        transparent={false}
        animationType="fade"
        onRequestClose={() => closeVideo()}
        statusBarTranslucent
        supportedOrientations={['portrait', 'landscape']}
      >
        <View style={styles.videoModalRoot}>
          {activeVideo ? (
            <Video
              source={{ uri: activeVideo }}
              style={StyleSheet.absoluteFill}
              controls
              resizeMode="contain"
              paused={false}
              onError={() => closeVideo()}
            />
          ) : null}
          <Pressable
            onPress={() => closeVideo()}
            accessibilityRole="button"
            accessibilityLabel="닫기"
            hitSlop={12}
            style={styles.videoModalClose}
          >
            <Text style={styles.videoModalCloseGlyph} allowFontScaling={false}>
              ✕
            </Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

function FeedMediaTile({
  media,
  styles,
  onPress,
}: {
  media: FeedItem['mediaUrls'][number];
  styles: ReturnType<typeof makeStyles>;
  onPress?: (media: FeedItem['mediaUrls'][number]) => void;
}): JSX.Element {
  if (media.kind === 'VIDEO') {
    const thumb = media.thumbnailUrl;
    return (
      <Pressable
        onPress={() => onPress?.(media)}
        style={[styles.mediaTile, thumb ? undefined : styles.mediaVideoPlaceholder]}
        accessibilityRole="button"
        accessibilityLabel="동영상 재생"
      >
        {thumb ? (
          <Image
            source={{ uri: thumb }}
            style={styles.mediaImage}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : null}
        <View style={styles.mediaPlayOverlay} pointerEvents="none">
          <View style={styles.mediaPlayDot}>
            <Text style={styles.mediaPlayGlyph} allowFontScaling={false}>
              ▶
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }
  // 이미지 — 탭 동작 없음 (lightbox 후속). View 로 감싸 안드로이드 ripple 오인 차단.
  return (
    <View
      style={styles.mediaTile}
      accessibilityRole="image"
      accessibilityLabel="사진"
    >
      <Image
        source={{ uri: media.url }}
        style={styles.mediaImage}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      // margin 은 화면 컨테이너 (FlatList) 가 처리. 카드 자체는 padding 만.
      padding: space[4],
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.hairline,
      backgroundColor: theme.bg,
      gap: space[2],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      // 모크의 marginBottom 10 은 카드 gap 으로 대체.
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarChar: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      includeFontPadding: false,
    },
    headerBody: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    nickname: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: letterSpacing.body,
    },
    subtitle: {
      fontFamily,
      fontSize: 11,
      fontWeight: fontWeight.medium,
      color: theme.text3,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
    },
    kindLabel: {
      fontFamily,
      fontSize: 12,
      fontWeight: fontWeight.bold,
      color: theme.text3,
      letterSpacing: 0.4,
    },
    note: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.medium,
      color: theme.text,
      lineHeight: 21, // 14 * 1.5
      letterSpacing: -0.14,
    },
    mediaSingle: {
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: theme.subtle,
    },
    mediaListContent: {
      gap: space[2],
    },
    mediaMultiCell: {
      width: 280,
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: theme.subtle,
    },
    mediaTile: {
      aspectRatio: 4 / 5,
      width: '100%',
      position: 'relative',
    },
    mediaImage: {
      width: '100%',
      height: '100%',
    },
    mediaVideoPlaceholder: {
      // 트랜스코드/썸네일 전까지 비디오 카드는 placeholder + ▶ 만 — 빈 검정/회색 박스 방지.
      backgroundColor: theme.subtle,
    },
    mediaPlayOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mediaPlayDot: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    mediaPlayGlyph: {
      fontFamily,
      fontSize: 22,
      color: '#FFFFFF',
      includeFontPadding: false,
      // ▶ 글리프가 좌측 정렬돼 보이는 시각 효과 보정.
      marginLeft: 3,
    },
    videoModalRoot: {
      flex: 1,
      backgroundColor: '#000000',
    },
    videoModalClose: {
      position: 'absolute',
      top: space[10],
      right: space[4],
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    videoModalCloseGlyph: {
      fontFamily,
      fontSize: 18,
      color: '#FFFFFF',
      includeFontPadding: false,
    },
    footer: {
      flexDirection: 'row',
      gap: space[5], // 모크의 18 ≈ space[5](20) 근사
      paddingTop: space[3],
      borderTopWidth: 1,
      borderTopColor: theme.hairline,
      marginTop: space[1],
    },
    footerCell: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[1] + 2, // 모크의 6
    },
    footerCount: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.text2,
      fontVariant: TABULAR_NUMS,
      includeFontPadding: false,
    },
  });
}
