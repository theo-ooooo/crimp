import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
  type PressableStateCallbackType,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useCommentsQuery,
  useCreateCommentMutation,
  useDeleteCommentMutation,
} from '@/hooks/useComments';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import {
  fontFamily,
  fontWeight,
  letterSpacing,
  radius,
  space,
  withAlpha,
  type Theme,
} from '@/lib/tokens';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTokens } from '@/lib/useTokens';
import type { Comment } from '@/lib/schemas/feed';

/**
 * 피드 게시글의 댓글 시트 (Modal slide-up).
 *
 * 기능:
 * - 댓글 목록 (useInfiniteQuery, 커서 기반)
 * - 댓글 작성 (1..1000자, 카운터 표기)
 * - 본인 댓글 삭제 (인라인 "삭제" 링크 → confirm Alert; 롱프레스 메뉴는 후속)
 *
 * 접근성/UX:
 * - useReducedMotion → animationType 'none' 폴백
 * - KeyboardAvoidingView 로 입력창 가림 방지 (iOS padding / Android height)
 * - 빈 상태 / 에러 / 로딩 / 페이지 로딩 구분
 *
 * NOTE: 상위 호환을 위해 시트는 controlled (`visible` + `onClose`).
 *   `currentUserExtId` 가 있으면 본인 댓글에 삭제 버튼 노출. 없으면 삭제 UI 숨김.
 */

const HEADER_LABEL_KEY = 'feed.comment.title';
const MAX_CONTENT = 1000;

export type CommentSheetProps = {
  visible: boolean;
  postExtId: string | null;
  accessToken: string | null;
  /** 본인 ext_id — 일치 댓글에 삭제 CTA 노출용. 없으면 삭제 UI 숨김. */
  currentUserExtId?: string | null;
  onClose: () => void;
};

export function CommentSheet({
  visible,
  postExtId,
  accessToken,
  currentUserExtId,
  onClose,
}: CommentSheetProps): JSX.Element {
  const theme = useTokens();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const {
    data,
    error,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useCommentsQuery(accessToken, postExtId);

  const createMutation = useCreateCommentMutation(accessToken, postExtId);
  const deleteMutation = useDeleteCommentMutation(accessToken, postExtId);

  const [draft, setDraft] = useState<string>('');

  const items: Comment[] = data?.pages.flatMap((p) => p.items) ?? [];

  const trimmed = draft.trim();
  const submitDisabled =
    trimmed.length === 0 ||
    trimmed.length > MAX_CONTENT ||
    createMutation.isPending ||
    !accessToken ||
    !postExtId;

  const onSubmit = () => {
    if (submitDisabled) {return;}
    createMutation.mutate(
      { content: trimmed },
      {
        onSuccess: () => {
          setDraft('');
        },
      },
    );
  };

  const onDelete = (commentExtId: string) => {
    Alert.alert(t('feed.comment.deleteConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => deleteMutation.mutate({ commentExtId }),
      },
    ]);
  };

  const handleClose = () => {
    if (createMutation.isPending) {return;}
    onClose();
  };

  const onEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage().catch(() => {
        /* 다음 시도에서 자동 재시도 */
      });
    }
  };

  const renderItem: ListRenderItem<Comment> = ({ item }) => (
    <CommentRow
      comment={item}
      isMine={
        Boolean(currentUserExtId) && item.userExtId === currentUserExtId
      }
      onDelete={onDelete}
    />
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={handleClose}
          accessibilityLabel={t('common.cancel')}
        />
        <KeyboardAvoidingView
          // iOS 는 padding, Android 는 height 가 안정적.
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kavWrap}
        >
          <View
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space[3]) }]}
            accessibilityViewIsModal
            accessibilityLiveRegion="polite"
          >
            <View style={styles.handleBar} />

            <View style={styles.header}>
              <Text style={styles.title}>{t(HEADER_LABEL_KEY)}</Text>
              <Pressable
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                hitSlop={8}
              >
                <Text style={styles.cancel}>{t('common.cancel')}</Text>
              </Pressable>
            </View>

            {/* 본문 — 로딩 / 에러 / 빈 / 목록 */}
            <View style={styles.bodyWrap}>
              {isLoading ? (
                <View style={styles.center}>
                  <ActivityIndicator color={theme.accent.base} />
                </View>
              ) : error ? (
                <ErrorBox error={error} onRetry={() => refetch()} />
              ) : (
                <FlatList
                  data={items}
                  keyExtractor={(c) => c.extId}
                  renderItem={renderItem}
                  contentContainerStyle={
                    items.length === 0
                      ? [styles.flex1, styles.listContent]
                      : styles.listContent
                  }
                  ListEmptyComponent={
                    <View style={styles.center}>
                      <Text style={styles.emptyBody}>
                        {t('feed.comment.empty')}
                      </Text>
                    </View>
                  }
                  ListFooterComponent={
                    isFetchingNextPage ? (
                      <View style={styles.footerLoader}>
                        <ActivityIndicator color={theme.accent.base} />
                      </View>
                    ) : null
                  }
                  onEndReached={onEndReached}
                  onEndReachedThreshold={0.3}
                  keyboardShouldPersistTaps="handled"
                />
              )}
            </View>

            {/* 작성 영역 */}
            <View style={styles.composer}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                multiline
                maxLength={MAX_CONTENT}
                placeholder={t('feed.comment.placeholder')}
                placeholderTextColor={theme.text4}
                style={styles.input}
                accessibilityLabel={t('feed.comment.placeholder')}
                editable={!createMutation.isPending}
              />
              {/* I5: 1000자 제한 카운터. 초과 임박 시 시각적 강조 (가까워질수록 강조). */}
              <Text
                style={[
                  styles.charCounter,
                  draft.length >= MAX_CONTENT
                    ? styles.charCounterMax
                    : null,
                ]}
                accessibilityLiveRegion="polite"
                allowFontScaling={false}
              >
                {draft.length} / {MAX_CONTENT}
              </Text>
              <Pressable
                onPress={onSubmit}
                disabled={submitDisabled}
                accessibilityRole="button"
                accessibilityLabel={
                  createMutation.isPending
                    ? t('feed.comment.submitting')
                    : t('feed.comment.submit')
                }
                accessibilityState={{ disabled: submitDisabled }}
                style={pressableComposerStyle(submitDisabled)}
              >
                <View
                  style={[
                    styles.submitBtn,
                    submitDisabled ? styles.submitBtnDisabled : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.submitLabel,
                      submitDisabled ? styles.submitLabelDisabled : null,
                    ]}
                  >
                    {createMutation.isPending
                      ? t('feed.comment.submitting')
                      : t('feed.comment.submit')}
                  </Text>
                </View>
              </Pressable>
            </View>

            {createMutation.error || deleteMutation.error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorBody}>
                  {toUserMessage(
                    createMutation.error ?? deleteMutation.error,
                  )}
                </Text>
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ===== Internal: CommentRow =====

type CommentRowProps = {
  comment: Comment;
  isMine: boolean;
  onDelete: (commentExtId: string) => void;
};

// I1: composer 의 onChangeText 가 매 키스트로크마다 부모를 리렌더하므로 모든 보이는 row
// 가 함께 리렌더된다. comment + isMine + onDelete 만 변하지 않으면 row 도 그대로 두기 위해
// React.memo 로 래핑.
const CommentRow = React.memo(function CommentRow({
  comment,
  isMine,
  onDelete,
}: CommentRowProps): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const avatarBg = `hsl(${comment.avatarColorHue}, 60%, 80%)`;
  const nickname = comment.userNickname ?? '';
  const avatarChar = Array.from(nickname)[0] ?? '?';
  const timeText = formatTimeShort(comment.createdAt);

  return (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
        <Text style={styles.avatarChar} allowFontScaling={false}>
          {avatarChar}
        </Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowHeader}>
          <Text style={styles.nickname} numberOfLines={1}>
            {nickname}
          </Text>
          <Text style={styles.time} numberOfLines={1}>
            {timeText}
          </Text>
        </View>
        <Text style={styles.content}>{comment.content}</Text>
        {isMine ? (
          <Pressable
            onPress={() => onDelete(comment.extId)}
            accessibilityRole="button"
            accessibilityLabel={t('feed.comment.deleteCta')}
            hitSlop={6}
            style={pressableDeleteStyle}
          >
            <Text style={styles.deleteCta}>{t('feed.comment.deleteCta')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

function ErrorBox({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.center}>
      <Text style={styles.errorTitle}>{t('feed.comment.errorTitle')}</Text>
      <Text style={styles.emptyBody}>{toUserMessage(error)}</Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={t('common.retry')}
        style={pressableDeleteStyle}
        hitSlop={6}
      >
        <Text style={styles.retryLabel}>{t('common.retry')}</Text>
      </Pressable>
    </View>
  );
}

// ===== utils =====

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * createdAt(ISO) → 사람이 읽는 짧은 표현. (FeedPostCard 와 동일 규칙)
 *
 * TODO: `lib/time.ts` 로 추출 — FeedPostCard 와 중복. 다음 PR 통합 정리.
 */
function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {return iso;}
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) {return t('feed.time.justNow');}
  if (diffMin < 60) {return t('feed.time.minutesAgo').replace('{{m}}', String(diffMin));}
  if (diffMs < ONE_DAY_MS) {
    const diffHour = Math.floor(diffMin / 60);
    return t('feed.time.hoursAgo').replace('{{h}}', String(diffHour));
  }
  try {
    return d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
  } catch {
    return d.toISOString().slice(5, 10);
  }
}

function pressableComposerStyle(disabled: boolean) {
  return ({ pressed }: PressableStateCallbackType): ViewStyle => {
    if (disabled) {return {};}
    return pressed ? { opacity: 0.85 } : {};
  };
}

function pressableDeleteStyle({
  pressed,
}: PressableStateCallbackType): ViewStyle {
  return pressed ? { opacity: 0.6 } : {};
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: withAlpha(theme.accent.ink, 0.5),
    },
    kavWrap: {
      // KAV 가 sheet 를 키보드 위로 밀어올리도록 — root 의 flex-end 를 보존하기 위해
      // 자기 자신은 height: auto, justifyContent flex-end 로 상속.
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.bg,
      borderTopLeftRadius: radius['2xl'],
      borderTopRightRadius: radius['2xl'],
      paddingTop: space[3],
      maxHeight: '92%',
      // 시트 내부 콘텐츠 높이 가변 — 댓글 0/많을 때 모두 자연스럽게.
      minHeight: 320,
    },
    handleBar: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.text4,
      alignSelf: 'center',
      marginBottom: space[3],
    },
    header: {
      paddingHorizontal: space[5],
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: space[3],
    },
    title: {
      fontFamily,
      fontSize: 20,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: -0.4,
    },
    cancel: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    bodyWrap: {
      flexShrink: 1,
      flexGrow: 1,
      minHeight: 200,
    },
    flex1: {
      flexGrow: 1,
    },
    listContent: {
      paddingHorizontal: space[5],
      paddingBottom: space[3],
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[2],
      padding: space[5],
    },
    emptyBody: {
      fontFamily,
      fontSize: 13,
      color: theme.text3,
      textAlign: 'center',
    },
    errorTitle: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
      textAlign: 'center',
    },
    retryLabel: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.bold,
      color: theme.text,
      paddingHorizontal: space[2],
      paddingVertical: space[1],
    },
    footerLoader: {
      paddingVertical: space[3],
      alignItems: 'center',
    },
    row: {
      flexDirection: 'row',
      gap: space[3],
      paddingVertical: space[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.hairline,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarChar: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      includeFontPadding: false,
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    rowHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: space[2],
    },
    nickname: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: letterSpacing.body,
      flexShrink: 1,
    },
    time: {
      fontFamily,
      fontSize: 11,
      fontWeight: fontWeight.medium,
      color: theme.text3,
    },
    content: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.medium,
      color: theme.text,
      lineHeight: 20,
      marginTop: 2,
    },
    deleteCta: {
      fontFamily,
      fontSize: 12,
      fontWeight: fontWeight.semibold,
      color: theme.semantic.danger,
      alignSelf: 'flex-start',
      marginTop: 4,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: space[2],
      paddingHorizontal: space[5],
      paddingTop: space[3],
      paddingBottom: space[3],
      borderTopWidth: 1,
      borderTopColor: theme.hairline,
    },
    input: {
      flex: 1,
      backgroundColor: theme.subtle,
      borderRadius: radius.lg,
      paddingHorizontal: space[3],
      paddingTop: space[2],
      paddingBottom: space[2],
      minHeight: 40,
      maxHeight: 120,
      color: theme.text,
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.medium,
      textAlignVertical: 'top',
    },
    charCounter: {
      fontFamily,
      fontSize: 11,
      fontWeight: fontWeight.medium,
      color: theme.text4,
      marginLeft: space[2],
      alignSelf: 'center',
      minWidth: 56,
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },
    charCounterMax: {
      color: theme.semantic.danger,
      fontWeight: fontWeight.bold,
    },
    submitBtn: {
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      borderRadius: radius.md,
      backgroundColor: theme.text,
      minWidth: 56,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnDisabled: {
      backgroundColor: theme.subtle2,
    },
    submitLabel: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.bold,
      color: theme.bg,
    },
    submitLabelDisabled: {
      color: theme.text4,
    },
    errorBox: {
      marginHorizontal: space[5],
      marginBottom: space[3],
      backgroundColor: withAlpha(theme.semantic.danger, 0.08),
      borderRadius: radius.md,
      padding: space[3],
    },
    errorBody: {
      fontFamily,
      fontSize: 13,
      color: theme.semantic.danger,
      fontWeight: fontWeight.semibold,
    },
  });
}
