import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';

import { CrimpIcon, Skeleton } from '@/components/primitives';
import { useGymsQuery } from '@/hooks/useGyms';
import { useMeQuery } from '@/hooks/useMe';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
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
import type { GymItem } from '@/lib/schemas/gym';
import { useTokenStore } from '@/store/tokenStore';

/**
 * 프로필 화면.
 *
 * Phase 1 구성:
 * - 닉네임 / 자기소개 / 레벨 (읽기 전용 표시)
 * - 내 암장 표시 / 변경 / 해제 — 본 PR 의 핵심.
 *
 * PR #59 백엔드 contract 정합:
 * - `me.mainGym = { extId, name, brand? } | null` 을 그대로 표시한다.
 * - 변경: `PATCH /me/profile` 본문에 `mainGymExtId` 를 보낸다.
 * - 해제: `PATCH /me/profile` 본문에 `clearMainGym: true` 를 보낸다.
 *
 * 더 이상 picker 비활성화/캐시 워크어라운드는 필요 없다.
 */
export default function ProfileScreen(): JSX.Element {
  const theme = useTokens();
  const hydrated = useTokenStore((s) => s.hydrated);
  const accessToken = useTokenStore((s) => s.accessToken);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!hydrated) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.muted}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!accessToken) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.heading}>{t('profile.loginRequiredTitle')}</Text>
        <Text style={styles.muted}>{t('profile.loginRequiredDescription')}</Text>
      </View>
    );
  }

  return <LoggedInProfile accessToken={accessToken} styles={styles} theme={theme} />;
}

type StylesT = ReturnType<typeof makeStyles>;

type LoggedInProps = {
  accessToken: string;
  styles: StylesT;
  theme: Theme;
};

function LoggedInProfile({ accessToken, styles, theme }: LoggedInProps): JSX.Element {
  const meQuery = useMeQuery(accessToken);
  const me = meQuery.data;
  // PR #59: 백엔드가 해석된 mainGym 객체를 그대로 내려준다 (extId/name/brand).
  // mainGymId 만 있고 mainGym 이 없는 케이스는 백엔드가 비활성/삭제로 판정한 상태.
  const mainGym = me?.mainGym ?? null;
  const hasMainGym = mainGym !== null && mainGym !== undefined;

  const [pickerOpen, setPickerOpen] = useState<boolean>(false);

  const updateMutation = useUpdateProfile(accessToken);

  const onPickerSelect = useCallback(
    (gym: GymItem) => {
      // PR #59: extId 기반 변경 — 백엔드가 numeric id 로 해석한다.
      updateMutation.mutate(
        { mainGymExtId: gym.extId },
        {
          onSuccess: () => setPickerOpen(false),
        },
      );
    },
    [updateMutation],
  );

  const onClearMainGym = useCallback(() => {
    Alert.alert(
      t('me.mainGym.clearConfirmTitle'),
      t('me.mainGym.clearConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('me.mainGym.clearCta'),
          style: 'destructive',
          // PR #59: 명시 해제는 sentinel(`clearMainGym: true`) 로 전송.
          onPress: () => updateMutation.mutate({ clearMainGym: true }),
        },
      ],
    );
  }, [updateMutation]);

  if (meQuery.isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.scrollContent}>
          <Skeleton width="40%" height={20} />
          <View style={{ height: space[3] }} />
          <Skeleton height={88} radius={radius.lg} />
          <View style={{ height: space[4] }} />
          <Skeleton height={120} radius={radius.lg} />
        </View>
      </View>
    );
  }

  if (meQuery.error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t('profile.loadErrorTitle')}</Text>
          <Text style={styles.muted}>{toUserMessage(meQuery.error)}</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 닉네임 / 레벨 */}
        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>{t('profile.title')}</Text>
          <Text style={styles.nickname}>
            {me?.nickname ?? t('home.nicknameFallback')}
          </Text>
          {me?.levelSelf !== null && me?.levelSelf !== undefined ? (
            <Text style={styles.levelText}>
              {t('profile.level')}: V{Math.max(0, me.levelSelf)}
            </Text>
          ) : null}
        </View>

        {/* 내 암장 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('me.mainGym.title')}</Text>
          <View style={styles.cardRow}>
            <View style={styles.cardRowLeft}>
              <View style={styles.gymIconCircle}>
                <CrimpIcon.pin size={20} color={theme.text2} />
              </View>
              <View style={styles.gymLabelBlock}>
                {hasMainGym ? (
                  <>
                    <Text style={styles.gymLabel} numberOfLines={2}>
                      {mainGym.name}
                    </Text>
                    {/* brand 키는 NON_NULL 정책으로 누락될 수 있다 — 표시는 있을 때만. */}
                    {mainGym.brand !== null && mainGym.brand !== undefined ? (
                      <Text style={styles.gymBrand} numberOfLines={1}>
                        {mainGym.brand}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text
                    style={[styles.gymLabel, styles.gymLabelMuted]}
                    numberOfLines={1}
                  >
                    {t('me.mainGym.unset')}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* 변경 / 해제 CTA */}
          <View style={styles.ctaRow}>
            <Pressable
              onPress={() => setPickerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={
                hasMainGym
                  ? t('me.mainGym.editCta')
                  : t('me.mainGym.setCta')
              }
              style={({ pressed }) => [
                styles.ctaButton,
                pressed ? styles.ctaButtonPressed : null,
              ]}
            >
              <Text style={styles.ctaButtonLabel}>
                {hasMainGym
                  ? t('me.mainGym.editCta')
                  : t('me.mainGym.setCta')}
              </Text>
            </Pressable>
            {hasMainGym ? (
              <Pressable
                onPress={onClearMainGym}
                disabled={updateMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel={t('me.mainGym.clearCta')}
                style={({ pressed }) => [
                  styles.ctaButtonDanger,
                  pressed ? styles.ctaButtonPressed : null,
                  updateMutation.isPending ? styles.ctaButtonDisabled : null,
                ]}
              >
                <Text style={styles.ctaButtonDangerLabel}>
                  {t('me.mainGym.clearCta')}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {updateMutation.isPending ? (
            <View style={styles.savingRow}>
              <ActivityIndicator color={theme.accent.base} />
              <Text style={styles.muted}>{t('me.mainGym.saving')}</Text>
            </View>
          ) : null}

          {updateMutation.error ? (
            <View style={styles.inlineErrorBox}>
              <Text style={styles.inlineErrorTitle}>
                {t('me.mainGym.errorTitle')}
              </Text>
              <Text style={styles.muted}>
                {toUserMessage(updateMutation.error)}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <MainGymPickerModal
        visible={pickerOpen}
        currentGymExtId={mainGym?.extId ?? null}
        saving={updateMutation.isPending}
        onClose={() => setPickerOpen(false)}
        onSelect={onPickerSelect}
      />
    </>
  );
}

// =====================================================================================
// MainGymPickerModal — 암장 검색 시트
// =====================================================================================

type MainGymPickerModalProps = {
  visible: boolean;
  currentGymExtId: string | null;
  saving: boolean;
  onClose: () => void;
  onSelect: (gym: GymItem) => void;
};

const SEARCH_DEBOUNCE_MS = 300;

function MainGymPickerModal({
  visible,
  currentGymExtId,
  saving,
  onClose,
  onSelect,
}: MainGymPickerModalProps): JSX.Element {
  const theme = useTokens();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeModalStyles(theme), [theme]);

  const [searchText, setSearchText] = useState<string>('');
  const [debouncedQ, setDebouncedQ] = useState<string>('');

  // 시트 닫힐 때 검색어 초기화 — 다음 진입 시 깨끗한 상태.
  useEffect(() => {
    if (!visible) {
      setSearchText('');
      setDebouncedQ('');
    }
  }, [visible]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setDebouncedQ(searchText.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [searchText]);

  const filters = useMemo(
    () => ({ q: debouncedQ.length > 0 ? debouncedQ : undefined }),
    [debouncedQ],
  );

  const {
    data,
    error,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGymsQuery(filters);

  const onRefresh = useCallback(() => {
    refetch().catch(() => {
      /* error 상태로 노출 */
    });
  }, [refetch]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage().catch(() => {
        /* 페이지 실패 무시 */
      });
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const gyms: GymItem[] = data?.pages.flatMap((p) => p.items) ?? [];

  const handleRowPress = useCallback(
    (gym: GymItem) => {
      // PR #59: extId 직접 사용 — 더 이상 내부 PK 가용 여부를 검사할 필요 없다.
      onSelect(gym);
    },
    [onSelect],
  );

  const renderItem = useCallback<ListRenderItem<GymItem>>(
    ({ item }) => (
      <GymPickerRow
        gym={item}
        active={
          currentGymExtId !== null && item.extId === currentGymExtId
        }
        onPress={() => handleRowPress(item)}
      />
    ),
    [handleRowPress, currentGymExtId],
  );

  const handleClose = () => {
    if (saving) {
      return;
    }
    onClose();
  };

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
          accessibilityLabel={t('me.mainGym.cancel')}
        />
        <View
          style={styles.sheet}
          accessibilityViewIsModal
          accessibilityLiveRegion="polite"
        >
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <Text style={styles.title}>{t('me.mainGym.pickerTitle')}</Text>
            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel={t('me.mainGym.cancel')}
              hitSlop={8}
            >
              <Text style={styles.cancel}>{t('me.mainGym.cancel')}</Text>
            </Pressable>
          </View>

          {/* 검색 입력 */}
          <View style={styles.searchWrap}>
            <View style={styles.searchField}>
              <CrimpIcon.search size={20} color={theme.text3} />
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder={t('me.mainGym.pickerSearchPlaceholder')}
                placeholderTextColor={theme.text4}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                clearButtonMode="while-editing"
                accessibilityLabel={t('me.mainGym.pickerSearchPlaceholder')}
              />
              {searchText.length > 0 && Platform.OS !== 'ios' ? (
                <Pressable
                  onPress={() => setSearchText('')}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('gym.list.searchClearLabel')}
                  style={styles.searchClear}
                >
                  <CrimpIcon.close size={18} color={theme.text3} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {isLoading ? (
            <View style={styles.content}>
              <Skeleton height={64} radius={radius.lg} />
              <View style={{ height: space[2] }} />
              <Skeleton height={64} radius={radius.lg} />
              <View style={{ height: space[2] }} />
              <Skeleton height={64} radius={radius.lg} />
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>{t('gym.list.errorTitle')}</Text>
              <Text style={styles.errorBody}>{toUserMessage(error)}</Text>
            </View>
          ) : (
            <FlatList
              data={gyms}
              keyExtractor={(item) => item.extId}
              contentContainerStyle={
                gyms.length === 0
                  ? [styles.flexContent, styles.content]
                  : styles.content
              }
              ItemSeparatorComponent={ItemSeparator}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={onRefresh}
                  tintColor={theme.accent.base}
                />
              }
              ListEmptyComponent={<EmptyPickerState />}
              renderItem={renderItem}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.3}
              keyboardShouldPersistTaps="handled"
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View style={styles.footer}>
                    <ActivityIndicator color={theme.accent.base} />
                  </View>
                ) : null
              }
            />
          )}

          {saving ? (
            <View style={styles.savingFooter}>
              <ActivityIndicator color={theme.accent.base} />
              <Text style={styles.savingFooterText}>
                {t('me.mainGym.saving')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const GymPickerRow = React.memo(function GymPickerRow({
  gym,
  active,
  onPress,
}: {
  gym: GymItem;
  active: boolean;
  onPress: () => void;
}): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeRowStyles(theme), [theme]);

  const a11yParts: string[] = [gym.name];
  if (gym.brand) {
    a11yParts.push(gym.brand);
  }
  if (gym.address) {
    a11yParts.push(gym.address);
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={a11yParts.join(', ')}
      style={({ pressed }) => [
        styles.row,
        active ? styles.rowActive : null,
        pressed ? styles.rowPressed : null,
      ]}
    >
      <View style={styles.rowMain}>
        <Text style={styles.name} numberOfLines={1}>
          {gym.name}
        </Text>
        <Text style={styles.address} numberOfLines={1}>
          {gym.address ?? t('gym.list.addressFallback')}
        </Text>
      </View>
      {active ? <CrimpIcon.check size={20} color={theme.accent.ink} /> : null}
    </Pressable>
  );
});

function EmptyPickerState(): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeEmptyStyles(theme), [theme]);
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <CrimpIcon.search size={32} color={theme.text3} />
      </View>
      <Text style={styles.title}>{t('gym.list.emptyTitle')}</Text>
      <Text style={styles.body}>{t('gym.list.emptyBody')}</Text>
    </View>
  );
}

function ItemSeparator(): JSX.Element {
  return <View style={itemSeparatorStyles.gap} />;
}

const itemSeparatorStyles = StyleSheet.create({
  gap: { height: space[2] },
});

// =====================================================================================
// Styles
// =====================================================================================

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: space[6],
      gap: space[3],
    },
    scrollContent: {
      padding: space[5],
      paddingBottom: space[14],
      gap: space[5],
    },
    muted: {
      fontFamily,
      fontSize: fontSize.body,
      color: theme.text3,
    },
    heading: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.bold,
      color: theme.text,
    },
    headerBlock: {
      gap: space[1],
    },
    eyebrow: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    nickname: {
      fontFamily,
      fontSize: fontSize.h1,
      fontWeight: fontWeight.extrabold,
      letterSpacing: letterSpacing.h1,
      color: theme.text,
    },
    levelText: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      color: theme.text2,
    },
    card: {
      backgroundColor: theme.subtle,
      borderRadius: radius.xl,
      padding: space[5],
      gap: space[3],
    },
    cardTitle: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.title,
      color: theme.text,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
    },
    cardRowLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      minWidth: 0,
    },
    gymIconCircle: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      backgroundColor: theme.chip,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gymLabelBlock: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    gymLabel: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      color: theme.text,
      letterSpacing: -0.15,
    },
    gymLabelMuted: {
      color: theme.text3,
      fontWeight: fontWeight.medium,
    },
    gymBrand: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.medium,
      color: theme.text3,
    },
    ctaRow: {
      flexDirection: 'row',
      gap: space[2],
    },
    ctaButton: {
      flex: 1,
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      borderRadius: radius.lg,
      backgroundColor: theme.accent.base,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaButtonPressed: {
      opacity: 0.85,
    },
    ctaButtonDisabled: {
      opacity: 0.5,
    },
    ctaButtonLabel: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.accent.on,
      letterSpacing: -0.15,
    },
    ctaButtonDanger: {
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      borderRadius: radius.lg,
      backgroundColor: withAlpha(theme.semantic.danger, 0.1),
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaButtonDangerLabel: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
      letterSpacing: -0.15,
    },
    savingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      paddingTop: space[1],
    },
    inlineErrorBox: {
      backgroundColor: withAlpha(theme.semantic.danger, 0.08),
      borderRadius: radius.md,
      padding: space[3],
      gap: space[1],
    },
    inlineErrorTitle: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
    },
    errorBox: {
      margin: space[5],
      backgroundColor: withAlpha(theme.semantic.danger, 0.08),
      borderRadius: radius.lg,
      padding: space[4],
      gap: space[1],
    },
    errorTitle: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
    },
  });
}

function makeModalStyles(theme: Theme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: withAlpha(theme.accent.ink, 0.5),
    },
    sheet: {
      backgroundColor: theme.bg,
      borderTopLeftRadius: radius['2xl'],
      borderTopRightRadius: radius['2xl'],
      paddingTop: space[3],
      paddingBottom: space[10],
      maxHeight: '92%',
      overflow: 'hidden',
    },
    handleBar: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.text4,
      alignSelf: 'center',
      marginBottom: space[4],
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
      fontSize: 22,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: -0.66,
    },
    cancel: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    searchWrap: {
      paddingHorizontal: space[5],
      paddingBottom: space[3],
    },
    searchField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      backgroundColor: theme.subtle,
      borderRadius: radius.lg,
      paddingHorizontal: space[4],
      paddingVertical: space[3],
    },
    searchInput: {
      flex: 1,
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      color: theme.text,
      letterSpacing: -0.15,
      padding: 0,
    },
    searchClear: {
      padding: space[1],
    },
    content: {
      paddingHorizontal: space[5],
      paddingBottom: space[6],
    },
    flexContent: {
      flexGrow: 1,
    },
    errorBox: {
      marginHorizontal: space[5],
      backgroundColor: withAlpha(theme.semantic.danger, 0.08),
      borderRadius: radius.lg,
      padding: space[4],
      gap: space[1],
    },
    errorTitle: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.semantic.danger,
    },
    errorBody: {
      fontFamily,
      fontSize: 13,
      color: theme.text2,
    },
    footer: {
      paddingVertical: space[4],
      alignItems: 'center',
    },
    savingFooter: {
      flexDirection: 'row',
      gap: space[2],
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: space[3],
      paddingHorizontal: space[5],
    },
    savingFooterText: {
      fontFamily,
      fontSize: fontSize.caption,
      color: theme.text3,
    },
  });
}

function makeRowStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      padding: space[4],
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
    },
    rowActive: {
      backgroundColor: theme.accent.soft,
    },
    rowPressed: {
      opacity: 0.85,
    },
    rowMain: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    name: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.text,
      letterSpacing: -0.15,
    },
    address: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.medium,
      color: theme.text3,
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
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space[2],
    },
    title: {
      fontFamily,
      fontSize: fontSize.title,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: letterSpacing.title,
      textAlign: 'center',
    },
    body: {
      fontFamily,
      fontSize: 14,
      fontWeight: fontWeight.medium,
      color: theme.text3,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 280,
    },
  });
}
