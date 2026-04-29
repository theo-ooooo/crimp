import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthHydrationGate } from '@/components/common/screen/AuthHydrationGate';
import { CommentSheet } from '@/components/feed/CommentSheet';
import { FeedBody } from '@/components/feed/FeedBody';
import { FeedFilterTabs } from '@/components/feed/FeedFilterTabs';
import { makeFeedStyles } from '@/components/feed/feedScreenStyles';
import { useMeQuery } from '@/hooks/queries/useMe';
import { useFeedScreen } from '@/hooks/screens/useFeedScreen';
import { useTokens } from '@/lib/useTokens';
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
  const styles = useMemo(() => makeFeedStyles(theme), [theme]);
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);
  const {
    filter,
    setFilter,
    commentPostExtId,
    onCommentPress,
    onCommentSheetClose,
    items,
    error,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    onRefresh,
    onEndReached,
  } = useFeedScreen(accessToken);

  // 댓글 행에서 본인 댓글 식별용 — Me 가 캐싱되어 있으면 즉시, 없으면 fetch.
  // 실패해도 시트 자체 동작은 영향 없음 (삭제 CTA 만 숨김).
  const meQuery = useMeQuery(accessToken);
  const currentUserExtId = meQuery.data?.extId ?? null;

  return (
    <AuthHydrationGate
      hydrated={hydrated}
      accessToken={accessToken}
      loginTitleKey="feed.loginRequiredTitle"
      loginDescriptionKey="feed.loginRequiredDescription"
    >
      {(token) => (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
          <FeedFilterTabs value={filter} onChange={setFilter} />
          <View style={styles.body}>
            <FeedBody
              isLoading={isLoading}
              error={error}
              items={items}
              accessToken={token}
              filter={filter}
              isRefetching={isRefetching}
              isFetchingNextPage={isFetchingNextPage}
              onRefresh={onRefresh}
              onEndReached={onEndReached}
              onCommentPress={onCommentPress}
            />
          </View>
          <CommentSheet
            visible={commentPostExtId !== null}
            postExtId={commentPostExtId}
            accessToken={token}
            currentUserExtId={currentUserExtId}
            onClose={onCommentSheetClose}
          />
        </View>
      )}
    </AuthHydrationGate>
  );
}
