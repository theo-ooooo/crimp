import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import {
  CrimpIcon,
  GradeBadge,
  HoldDot,
  ResultMark,
} from '@/components/primitives';
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
 * - 같은 날: "{H}시간 전"
 * - 그 외: 로컬 짧은 날짜 (ex. "04-25")
 *
 * SessionDetailScreen 의 헬퍼와 별도로 두되 후속 PR 에서 `lib/time.ts` 로 통합 가능 (TODO).
 */
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
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return t('feed.time.hoursAgo').replace('{{h}}', String(diffHour));
  }
  // 24시간 이상은 짧은 월-일 표시. 로컬화는 toLocaleDateString 에 위임.
  try {
    return d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
  } catch {
    return d.toISOString().slice(5, 10);
  }
}

export function FeedPostCard({ item }: FeedPostCardProps): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const avatarBg = hueToBg(item.avatarColorHue);
  const avatarChar = item.userNickname.slice(0, 1);
  const timeText = formatTimeShort(item.loggedAt);
  const subtitle = item.gymName ? `${timeText} · ${item.gymName}` : timeText;
  const result = item.result as AttemptResult;
  const resultLabel = t(`attempt.result.${result}` as const);

  const grade = item.gradeValue?.trim();
  // holdColor 는 백엔드가 자유 문자열을 줄 수도 있어 theme.hold 키가 아닐 수 있다.
  // 그 경우 HoldDot 의 raw color fallback 에 의지한다 (HoldDot.resolveColor 참고).
  const showHold = Boolean(item.holdColor);

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${item.userNickname} · ${resultLabel}${grade ? ` ${grade}` : ''}`}
    >
      {/* 헤더: 아바타 · 닉네임/메타 · ResultMark */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <Text style={styles.avatarChar} allowFontScaling={false}>
            {avatarChar}
          </Text>
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

      {/* 푸터: 좋아요 / 댓글 */}
      <View style={styles.footer}>
        <View style={styles.footerCell}>
          <CrimpIcon.heart size={16} color={theme.text2} />
          <Text style={styles.footerCount} allowFontScaling={false}>
            {item.likes}
          </Text>
        </View>
        <View style={styles.footerCell}>
          <CrimpIcon.chat size={16} color={theme.text2} />
          <Text style={styles.footerCount} allowFontScaling={false}>
            {item.comments}
          </Text>
        </View>
      </View>
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
