import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Skeleton } from '@/components/primitives';
import { CommentSheet } from '@/components/feed/CommentSheet';
import { FeedFilterTabs } from '@/components/feed/FeedFilterTabs';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { useFeedQuery } from '@/hooks/useFeed';
import { useMeQuery } from '@/hooks/useMe';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
  withAlpha,
  type Theme,
} from '@/lib/tokens';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTokens } from '@/lib/useTokens';
import {
  DEFAULT_FEED_FILTER,
  type FeedFilter,
  type FeedItem,
} from '@/lib/schemas/feed';
import { useTokenStore } from '@/store/tokenStore';

/**
 * 피드 화면.
 *
 * 디자인 출처: docs/design/claude/v2/screens-ios-2.jsx:482-538
 *
 * - 상단 헤더: "피드" 32px extrabold (h1), padding 24/20/12.
 * - 필터 칩 가로 스크롤 (친구·인기·내 암장). 기본은 모크에 맞춰 "친구".
 * - 본문: FlatList + RefreshControl + onEndReached 커서 페이지네이션.
 * - 로딩: 3개 스켈레톤 카드. 페이지 로딩: 푸터 ActivityIndicator.
 * - 에러: errorBox + 인라인 retry 버튼.
 * - 빈 상태: 활성 필터 컨텍스트 안내.
 * - BottomTabs 는 별개 PR. 본 화면에서는 safe-area bottom 만 패딩으로 확보.
 */
export default function FeedScreen(): JSX.Element {
  const theme = useTokens();
  const insets = useSafeAreaInsets();
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);
  const [filter, setFilter] = useState<FeedFilter>(DEFAULT_FEED_FILTER);
  // 댓글 시트 — 한 번에 한 게시글만. null 이면 닫힘.
  const [commentPostExtId, setCommentPostExtId] = useState<string | null>(null);

  const styles = useMemo(() => makeStyles(theme), [theme]);

  // 댓글 행에서 본인 댓글 식별용 — Me 가 캐싱되어 있으면 즉시, 없으면 fetch.
  // 실패해도 시트 자체 동작은 영향 없음 (삭제 CTA 만 숨김).
  const meQuery = useMeQuery(accessToken);
  const currentUserExtId = meQuery.data?.extId ?? null;

  const {
    data,
    error,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFeedQuery(accessToken, filter);

  const onRefresh = useCallback(() => {
    refetch().catch(() => {
      /* 새로고침 실패는 error 로 노출 */
    });
  }, [refetch]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage().catch(() => {
        /* 페이지 실패 무시 — 다음 시도에서 재시도 */
      });
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const onCommentPress = useCallback((postExtId: string) => {
    setCommentPostExtId(postExtId);
  }, []);

  const onCommentSheetClose = useCallback(() => {
    setCommentPostExtId(null);
  }, []);

  // hydrate 전: tokenStore 가 아직 SecureStore 를 읽지 못한 상태. 깜빡임 방지로 로딩만.
  if (!hydrated) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.muted}>{t('common.loading')}</Text>
      </View>
    );
  }

  // 비로그인: SessionDetailScreen 과 동일 패턴 — 별도 prompt 사용.
  if (!accessToken) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.heading}>{t('feed.loginRequiredTitle')}</Text>
        <Text style={styles.muted}>{t('feed.loginRequiredDescription')}</Text>
      </View>
    );
  }

  const items: FeedItem[] = data?.pages.flatMap((p) => p.items) ?? [];

  const renderItem: ListRenderItem<FeedItem> = ({ item }) => (
    <View style={styles.cardWrap}>
      <FeedPostCard
        item={item}
        accessToken={accessToken}
        onCommentPress={onCommentPress}
      />
    </View>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text
          style={styles.title}
          accessibilityRole="header"
          accessibilityLabel={t('feed.title')}
        >
          {t('feed.title')}
        </Text>
      </View>

      <FeedFilterTabs value={filter} onChange={setFilter} />

      {isLoading ? (
        <View style={styles.skeletonWrap}>
          <Skeleton height={180} radius={18} />
          <Skeleton height={180} radius={18} />
          <Skeleton height={180} radius={18} />
        </View>
      ) : error ? (
        <ErrorBox error={error} onRetry={onRefresh} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.extId}
          renderItem={renderItem}
          contentContainerStyle={
            items.length === 0
              ? [styles.flexContent, styles.listContent]
              : styles.listContent
          }
          ListEmptyComponent={<EmptyState filter={filter} />}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator color={theme.accent.base} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={theme.accent.base}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
        />
      )}

      <CommentSheet
        visible={commentPostExtId !== null}
        postExtId={commentPostExtId}
        accessToken={accessToken}
        currentUserExtId={currentUserExtId}
        onClose={onCommentSheetClose}
      />
    </View>
  );
}

function ErrorBox({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}): JSX.Element {
  const theme = useTokens();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeErrorStyles(theme), [theme]);
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{t('feed.errorTitle')}</Text>
      <Text style={styles.body}>{toUserMessage(error)}</Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={t('common.retry')}
        style={({ pressed }) => [
          styles.retry,
          pressed && !reducedMotion ? styles.retryPressed : null,
        ]}
      >
        <Text style={styles.retryLabel}>{t('common.retry')}</Text>
      </Pressable>
    </View>
  );
}

function EmptyState({ filter }: { filter: FeedFilter }): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeEmptyStyles(theme), [theme]);
  // 필터별 친근한 메시지. friends 는 follow 도메인 미도입 상태라 항상 빈 결과 → 톤 별도.
  const titleKey =
    filter === 'friends'
      ? 'feed.empty.friends.title'
      : filter === 'my-gym'
      ? 'feed.empty.myGym.title'
      : 'feed.empty.popular.title';
  const bodyKey =
    filter === 'friends'
      ? 'feed.empty.friends.body'
      : filter === 'my-gym'
      ? 'feed.empty.myGym.body'
      : 'feed.empty.popular.body';
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t(titleKey)}</Text>
      <Text style={styles.body}>{t(bodyKey)}</Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
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
    header: {
      // 모크: padding 24px 20px 12px
      paddingTop: space[6],
      paddingHorizontal: space[5],
      paddingBottom: space[3],
    },
    title: {
      fontFamily,
      fontSize: fontSize.h1,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: letterSpacing.h1,
    },
    listContent: {
      paddingTop: space[1],
      paddingBottom: space[10],
    },
    flexContent: {
      flexGrow: 1,
    },
    cardWrap: {
      // 모크: margin 0 20 12. 카드 간 12 간격.
      marginHorizontal: space[5],
      marginBottom: space[3],
    },
    skeletonWrap: {
      paddingHorizontal: space[5],
      paddingTop: space[1],
      gap: space[3],
    },
    footer: {
      paddingVertical: space[4],
      alignItems: 'center',
    },
  });
}

function makeErrorStyles(theme: Theme) {
  return StyleSheet.create({
    box: {
      marginHorizontal: space[5],
      marginTop: space[3],
      backgroundColor: withAlpha(theme.semantic.danger, 0.08),
      borderRadius: radius.lg,
      padding: space[4],
      gap: space[2],
    },
    title: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
    },
    body: {
      fontFamily,
      fontSize: 13,
      color: theme.text2,
    },
    retry: {
      alignSelf: 'flex-start',
      marginTop: space[1],
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      borderRadius: radius.md,
      backgroundColor: theme.text,
    },
    retryPressed: {
      opacity: 0.85,
    },
    retryLabel: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.bold,
      color: theme.bg,
    },
  });
}

function makeEmptyStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space[6],
      gap: space[2],
    },
    title: {
      fontFamily,
      fontSize: 18,
      fontWeight: fontWeight.bold,
      color: theme.text,
      textAlign: 'center',
    },
    body: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.medium,
      color: theme.text3,
      textAlign: 'center',
      maxWidth: 280,
      lineHeight: 20,
    },
  });
}
