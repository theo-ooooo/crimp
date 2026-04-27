import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
 * Phase 1 의 최소 구성:
 * - 닉네임 / 자기소개 레벨(읽기 전용 표시)
 * - 내 암장 (mainGymId) 표시 / 변경 / 해제 — 본 PR 의 핵심.
 *
 * 내 암장 변경은 `MainGymPickerModal` 시트로 처리한다 (별도 화면 ↑↓ 전환 비용 회피).
 *
 * 백엔드 `MeResponse` 는 `mainGymId` (number | null) 만 반환하므로, 현재 설정된 암장의
 * 표시 이름은 사용자가 직접 시트에서 선택한 직후의 GymItem 을 메모리 캐시에 보관해
 * 보여 준다. 페이지 재진입 시 mainGymId 만 있고 이름을 모르면 "설정됨" placeholder 만
 * 노출 — 백엔드가 expanded gym 응답을 추가하는 후속 PR 에서 해소 (TODO: F-mainGym-expand).
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
  const mainGymId = me?.mainGymId ?? null;

  const [pickerOpen, setPickerOpen] = useState<boolean>(false);

  // 사용자가 시트에서 선택한 GymItem 을 기억 — mainGymId 만 받는 백엔드 응답을 보완.
  const [cachedGym, setCachedGym] = useState<GymItem | null>(null);

  // 외부 요인(다른 기기)으로 mainGymId 가 해제되면 캐시도 비운다.
  useEffect(() => {
    if (mainGymId === null && cachedGym !== null) {
      setCachedGym(null);
    }
  }, [mainGymId, cachedGym]);

  const updateMutation = useUpdateProfile(accessToken);

  const onPickerSelect = useCallback(
    (gym: GymItem, internalId: number) => {
      updateMutation.mutate(
        { mainGymId: internalId },
        {
          onSuccess: () => {
            setCachedGym(gym);
            setPickerOpen(false);
          },
        },
      );
    },
    [updateMutation],
  );

  const onClearMainGym = useCallback(() => {
    // 백엔드 `UserService.updateMyProfile` 가 `cmd.mainGymId() != null` 일 때만 갱신해
    // 명시 null 로 해제 가능 — 단, 현재 백엔드 구현은 null 을 전달해도 변경 없음 (no-op).
    // 진정한 해제 동작은 후속 백엔드 PR 에서 sentinel(`clearMainGym: true`) 도입 후 활성화.
    // (TODO: F-mainGym-clear)
    // 현재는 사용자 의도를 보존하기 위해 PATCH 는 보내되, 응답 mainGymId 가 여전히 차 있어
    // UI 가 동기화되지 않을 수 있다는 점을 캐시 무효화로 사전 표시한다.
    updateMutation.mutate(
      { mainGymId: null },
      {
        onSuccess: (updated) => {
          if (updated.mainGymId === null) {
            setCachedGym(null);
          }
        },
      },
    );
  }, [updateMutation]);

  // 표시할 암장 라벨 결정.
  const mainGymLabel: string = (() => {
    if (mainGymId === null) {
      return t('me.mainGym.unset');
    }
    if (cachedGym !== null) {
      return cachedGym.name;
    }
    return t('me.mainGym.setUnknownLabel');
  })();

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
              <Text
                style={[
                  styles.gymLabel,
                  mainGymId === null ? styles.gymLabelMuted : null,
                ]}
                numberOfLines={2}
              >
                {mainGymLabel}
              </Text>
            </View>
          </View>

          {/* 변경 / 해제 CTA */}
          <View style={styles.ctaRow}>
            <Pressable
              onPress={() => setPickerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={
                mainGymId === null
                  ? t('me.mainGym.setCta')
                  : t('me.mainGym.editCta')
              }
              style={({ pressed }) => [
                styles.ctaButton,
                pressed ? styles.ctaButtonPressed : null,
              ]}
            >
              <Text style={styles.ctaButtonLabel}>
                {mainGymId === null
                  ? t('me.mainGym.setCta')
                  : t('me.mainGym.editCta')}
              </Text>
            </Pressable>
            {mainGymId !== null ? (
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
        currentGymId={mainGymId}
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
  currentGymId: number | null;
  saving: boolean;
  onClose: () => void;
  onSelect: (gym: GymItem, internalId: number) => void;
};

const SEARCH_DEBOUNCE_MS = 300;

function MainGymPickerModal({
  visible,
  currentGymId,
  saving,
  onClose,
  onSelect,
}: MainGymPickerModalProps): JSX.Element {
  const theme = useTokens();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeModalStyles(theme), [theme]);

  const [searchText, setSearchText] = useState<string>('');
  const [debouncedQ, setDebouncedQ] = useState<string>('');
  const [pickError, setPickError] = useState<string | null>(null);

  // 시트 닫힐 때 검색어/에러 초기화 — 다음 진입 시 깨끗한 상태.
  useEffect(() => {
    if (!visible) {
      setSearchText('');
      setDebouncedQ('');
      setPickError(null);
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
      // GymItem.id 는 백엔드 응답에 포함되지 않는 한 undefined. 백엔드가 mainGymId(Long)
      // 을 PATCH 본문으로 받기에 내부 PK 가 가용해진 뒤에만 활성화된다.
      // (TODO: F-gym-internal-id — backend 가 GymItem 응답에 `id` 필드 추가)
      const internalId = typeof gym.id === 'number' ? gym.id : null;
      if (internalId === null) {
        setPickError(t('me.mainGym.pickerUnsupported'));
        return;
      }
      setPickError(null);
      onSelect(gym, internalId);
    },
    [onSelect],
  );

  const renderItem = useCallback<ListRenderItem<GymItem>>(
    ({ item }) => (
      <GymPickerRow
        gym={item}
        active={
          typeof item.id === 'number' &&
          currentGymId !== null &&
          item.id === currentGymId
        }
        onPress={() => handleRowPress(item)}
      />
    ),
    [handleRowPress, currentGymId],
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

          {pickError !== null ? (
            <View style={styles.pickErrorBox}>
              <Text style={styles.pickErrorText}>{pickError}</Text>
            </View>
          ) : null}

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
    gymLabel: {
      flex: 1,
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
    pickErrorBox: {
      marginHorizontal: space[5],
      marginBottom: space[3],
      backgroundColor: withAlpha(theme.semantic.warning, 0.12),
      borderRadius: radius.md,
      padding: space[3],
    },
    pickErrorText: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.semantic.warning,
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
