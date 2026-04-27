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
import { useLogout } from '@/hooks/useAuth';
import { useGymsQuery } from '@/hooks/useGyms';
import { useMeQuery } from '@/hooks/useMe';
import { useMeStatsQuery } from '@/hooks/useMeStats';
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
import type { Me } from '@/lib/schemas/me';
import type { MeStats } from '@/lib/schemas/meStats';
import { useTokenStore } from '@/store/tokenStore';

/**
 * 프로필 화면.
 *
 * 디자인 출처: docs/design/claude/v2/screens-ios-2.jsx:384 (`ProfileScreen`)
 *
 * Mock 레이아웃 정렬 (v2):
 * - 헤더 row: 아바타(이니셜 그라데이션) + 닉네임 22px 800 + 보조 (bio)
 * - 통계 row: 완등 / 세션 / (친구는 도메인 미도입 — 생략) 3개 인라인
 * - Hero: 최고 그레이드 큰 숫자 (accent 색상, 80px display)
 * - 내 암장 카드 (PR #61 — 기존 동작 그대로 유지)
 *
 * Phase 1 한계로 mock 의 그레이드 분포 / 배지 / 친구 카운트 / 설정 아이콘은 생략.
 *
 * 비즈니스 로직 무변경:
 * - useMeQuery / useUpdateProfile mutation / pull-to-refresh 동일
 * - MainGymPickerModal 호출 / mainGym 변경·해제 흐름 동일
 * - me/stats 표시는 추가 (useMeStatsQuery — HomeScreen 과 동일 캐시 키 재사용).
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
  const statsQuery = useMeStatsQuery(accessToken);
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
          // I3: picker 가 열려있는 동안 mutation error 는 ProfileScreen 의 errorBox 가
          // 모달 backdrop 너머라 보이지 않는다 → Alert 로 명시 노출. picker 는 그대로 열려있어
          // 사용자가 다른 암장을 다시 선택할 수 있다.
          onError: (err) => {
            Alert.alert(
              t('profile.errorTitle'),
              toUserMessage(err),
            );
          },
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

  // I4: pull-to-refresh — me 쿼리 재조회. 모든 hooks 는 early return 전에 위치해야
  // rules-of-hooks 준수.
  const onRefresh = useCallback(() => {
    meQuery.refetch().catch(() => {
      /* 에러는 meQuery.error 로 노출 */
    });
    statsQuery.refetch().catch(() => {
      /* stats 실패는 stats 영역만 가려진다 */
    });
  }, [meQuery, statsQuery]);

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
        refreshControl={
          <RefreshControl
            refreshing={meQuery.isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.text2}
          />
        }
      >
        {/* eyebrow + 헤더 row (mock: 아바타 72/72 그라데이션 원 + 닉네임/bio) */}
        <View style={styles.headerEyebrowBlock}>
          <Text style={styles.eyebrow}>{t('profile.title')}</Text>
        </View>
        <ProfileHeaderRow me={me ?? null} styles={styles} theme={theme} />

        {/* 통계 row — me/stats 데이터로 완등 / 세션 / 최고 표시 */}
        <ProfileStatsRow stats={statsQuery.data ?? null} loading={statsQuery.isLoading} styles={styles} />

        {/* Hero — 최고 그레이드 큰 숫자 (mock subtle bg / radius 20 / V6 80px accent) */}
        <ProfileTopGradeHero stats={statsQuery.data ?? null} styles={styles} theme={theme} />

        {/* 내 암장 카드 (PR #61 — 시각만 유지) */}
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

        <LogoutSection styles={styles} />
      </ScrollView>

      {/* I1: picker 가 닫혀있을 때 mount 자체를 막아 useGymsQuery 가 ProfileScreen
          진입 직후에 즉시 발화되지 않도록. visible 가 toggle 되면 모달은 매번 재마운트되며
          애니메이션은 RN Modal 의 동작상 그대로 유지. */}
      {pickerOpen ? (
        <MainGymPickerModal
          visible={pickerOpen}
          currentGymExtId={mainGym?.extId ?? null}
          saving={updateMutation.isPending}
          onClose={() => setPickerOpen(false)}
          onSelect={onPickerSelect}
        />
      ) : null}
    </>
  );
}

// =====================================================================================
// 로그아웃 섹션 — 화면 하단 단일 버튼.
//
// `useLogout` 가 백엔드 호출 (best-effort) → store.clear() → qc.clear() → navigation
// reset(Login) 까지 모두 처리한다. 여기선 진행 중 상태만 로컬로 추적해 더블 탭 방지.
// destructive 가 아니라 회복 가능한 액션이므로 별도 confirm 다이얼로그는 두지 않는다.
// =====================================================================================

function LogoutSection({ styles }: { styles: StylesT }): JSX.Element {
  const logout = useLogout();
  const [pending, setPending] = useState<boolean>(false);

  const onPress = useCallback(async () => {
    if (pending) {
      return;
    }
    setPending(true);
    try {
      await logout();
    } finally {
      // navigation.reset 후 컴포넌트가 언마운트되더라도 state setter 자체는 안전.
      setPending(false);
    }
  }, [logout, pending]);

  return (
    <Pressable
      onPress={onPress}
      disabled={pending}
      accessibilityRole="button"
      accessibilityLabel={t('profile.logout')}
      style={({ pressed }) => [
        styles.logoutButton,
        pressed ? styles.logoutButtonPressed : null,
        pending ? styles.logoutButtonDisabled : null,
      ]}
    >
      <Text style={styles.logoutButtonLabel}>
        {pending ? t('profile.logoutLoading') : t('profile.logout')}
      </Text>
    </Pressable>
  );
}

// =====================================================================================
// Profile header / stats / hero — mock 정렬용 sub-components
// =====================================================================================

/**
 * 닉네임 / 아바타 row.
 * Mock: 72/72 원형 그라데이션 + 닉네임 22px 800 + bio 13px text3.
 *
 * RN 은 단색 background 만 지원 (linear-gradient 미지원). accent.base 단색으로 근사하고,
 * 후속에 react-native-svg 도입 시 그라데이션으로 교체.
 */
function ProfileHeaderRow({
  me,
  styles,
  theme,
}: {
  me: Me | null;
  styles: StylesT;
  theme: Theme;
}): JSX.Element {
  const nickname = me?.nickname ?? t('home.nicknameFallback');
  const initial = nickname.trim().slice(0, 1) || '?';
  const bio = me?.bio ?? null;
  return (
    <View style={styles.headerRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText} accessibilityLabel={nickname}>
          {initial}
        </Text>
      </View>
      <View style={styles.headerRowBody}>
        <Text style={styles.nickname} numberOfLines={1}>
          {nickname}
        </Text>
        {bio !== null && bio.length > 0 ? (
          <Text style={styles.bioText} numberOfLines={2}>
            {bio}
          </Text>
        ) : me?.levelSelf !== null && me?.levelSelf !== undefined ? (
          <Text style={styles.bioText}>
            {t('profile.level')} V{Math.max(0, me.levelSelf)}
          </Text>
        ) : (
          <Text style={[styles.bioText, { color: theme.text4 }]}>
            {t('profile.bioFallback')}
          </Text>
        )}
      </View>
    </View>
  );
}

/**
 * 통계 row — mock 의 friends bar 와 같은 인라인 레이아웃.
 * "184 완등  47 세션  최고 V6" 식으로 굵은 숫자 + 작은 라벨.
 */
function ProfileStatsRow({
  stats,
  loading,
  styles,
}: {
  stats: MeStats | null;
  loading: boolean;
  styles: StylesT;
}): JSX.Element {
  if (loading && !stats) {
    return (
      <View style={styles.statsRow}>
        <Skeleton width={48} height={20} />
        <View style={{ width: space[5] }} />
        <Skeleton width={48} height={20} />
        <View style={{ width: space[5] }} />
        <Skeleton width={48} height={20} />
      </View>
    );
  }
  if (!stats) {
    return <View style={styles.statsRow} />;
  }
  return (
    <View style={styles.statsRow}>
      <StatPill value={stats.totalSends} label={t('profile.statTotalSends')} styles={styles} />
      <StatPill value={stats.totalSessions} label={t('profile.statTotalSessions')} styles={styles} />
      <StatPill
        value={stats.topGrade ?? t('profile.topGradeEmpty')}
        label={t('profile.statTopGrade')}
        styles={styles}
      />
    </View>
  );
}

function StatPill({
  value,
  label,
  styles,
}: {
  value: string | number;
  label: string;
  styles: StylesT;
}): JSX.Element {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillValue}>{String(value)}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

/**
 * 최고 그레이드 hero card.
 * Mock: subtle bg / radius 20 / 좌측 80px accent 색 큰 숫자, 우측 trend marker.
 *
 * Phase 1 에서 stats 의 topGrade 가 null 이면 "—" + 안내 문구.
 * 주: mock 의 "신기록" 트렌드 비교는 백엔드에서 weekTopGrade vs prevWeekTopGrade 가
 * 추가될 때 도입. 현재는 정적 라벨.
 */
function ProfileTopGradeHero({
  stats,
  styles,
  theme,
}: {
  stats: MeStats | null;
  styles: StylesT;
  theme: Theme;
}): JSX.Element {
  const topGrade = stats?.topGrade ?? null;
  return (
    <View style={styles.heroCard}>
      <Text style={styles.heroCaption}>{t('profile.topGradeHeroTitle')}</Text>
      <View style={styles.heroRow}>
        <Text
          style={[
            styles.heroNumber,
            topGrade === null ? { color: theme.text3 } : null,
          ]}
        >
          {topGrade ?? t('profile.topGradeEmpty')}
        </Text>
        {topGrade === null ? (
          <Text style={styles.heroSubtext}>
            {t('profile.topGradeEmptyHint')}
          </Text>
        ) : null}
      </View>
    </View>
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
        onSelect={handleRowPress}
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

// I2: row 가 gym 자체를 onSelect 에 넘겨주므로, 부모는 인라인 클로저 없이 stable
// handler 하나만 내려보낼 수 있다 → React.memo 가 무력화되지 않음.
const GymPickerRow = React.memo(function GymPickerRow({
  gym,
  active,
  onSelect,
}: {
  gym: GymItem;
  active: boolean;
  onSelect: (gym: GymItem) => void;
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

  // 콜백은 row 안에서 useCallback 으로 wrap — gym/onSelect 변하지 않으면 안정.
  const handlePress = useCallback(() => {
    onSelect(gym);
  }, [gym, onSelect]);

  return (
    <Pressable
      onPress={handlePress}
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
    /** Mock paddingTop 64 + paddingBottom 110 (BottomTabs). RN 미도입 → 14. */
    scrollContent: {
      paddingHorizontal: space[5],
      paddingTop: space[6],
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
    /** Eyebrow row — mock 의 settings icon 자리는 Phase 1 에서 생략. */
    headerEyebrowBlock: {
      gap: space[1],
    },
    eyebrow: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    /** Mock: padding 20/20/0, gap 16. */
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[4],
    },
    /** Mock 아바타 72/72 원형 + accent 단색 (그라데이션은 svg 도입 후 추후) */
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.accent.base,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontFamily,
      fontSize: 28,
      fontWeight: fontWeight.extrabold,
      letterSpacing: -1.12,
      color: theme.accent.on,
      includeFontPadding: false,
    },
    headerRowBody: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    /** Mock 닉네임 22px 800 letterSpacing -0.03em. */
    nickname: {
      fontFamily,
      fontSize: 22,
      fontWeight: fontWeight.extrabold,
      letterSpacing: -0.66,
      color: theme.text,
    },
    bioText: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.medium,
      color: theme.text3,
    },
    /** Mock 통계 row: padding 16/20/0, fontSize 13, gap 22 (≒ space[5]). */
    statsRow: {
      flexDirection: 'row',
      gap: space[5],
      flexWrap: 'wrap',
    },
    statPill: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: space[1],
    },
    statPillValue: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.extrabold,
      color: theme.text,
      letterSpacing: -0.13,
      includeFontPadding: false,
    },
    statPillLabel: {
      fontFamily,
      fontSize: 13,
      fontWeight: fontWeight.semibold,
      color: theme.text3,
    },
    /** Hero — 최고 그레이드 카드. Mock: subtle bg / radius 20 / padding 22. */
    heroCard: {
      backgroundColor: theme.subtle,
      borderRadius: radius.xl,
      padding: space[5],
      gap: space[2],
    },
    heroCaption: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      color: theme.text3,
      letterSpacing: -0.12,
    },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: space[4],
    },
    /** Mock 80px 800 letterSpacing -0.06em accent base. */
    heroNumber: {
      fontFamily,
      fontSize: 80,
      fontWeight: fontWeight.extrabold,
      letterSpacing: -4.8,
      lineHeight: 80 * 0.9,
      color: theme.accent.base,
      includeFontPadding: false,
    },
    heroSubtext: {
      fontFamily,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.medium,
      color: theme.text3,
      flexShrink: 1,
    },
    /** 내 암장 카드 (PR #61 — 시각 그대로 유지) */
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
      letterSpacing: letterSpacing.body,
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
      letterSpacing: letterSpacing.body,
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
      letterSpacing: letterSpacing.body,
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
    /** 로그아웃 — subtle bg + text2 라벨. 회복 가능 액션이라 강조하지 않는다. */
    logoutButton: {
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoutButtonPressed: {
      opacity: 0.85,
    },
    logoutButtonDisabled: {
      opacity: 0.5,
    },
    logoutButtonLabel: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      color: theme.text2,
      letterSpacing: letterSpacing.body,
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
      letterSpacing: letterSpacing.body,
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
      letterSpacing: letterSpacing.body,
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
