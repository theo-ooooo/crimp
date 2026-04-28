import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CrimpIcon, Skeleton } from '@/components/primitives';
import { useGymsQuery } from '@/hooks/useGyms';
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
  type Theme,
} from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';
import type { GymItem } from '@/lib/schemas/gym';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useTokenStore } from '@/store/tokenStore';

/**
 * MainGym 온보딩 게이트 화면.
 *
 * 기획 (`docs/기획/maingym-onboarding.md`) §5.2 / 설계 (`docs/설계/sequence/maingym-onboarding.md`) §3.2.
 *
 * - `App.tsx` 의 RootNavigator 가 `me.mainGym === null && !dismissedThisSession` 일 때 이 화면을 단독 노출.
 * - "이 암장으로 설정": `useUpdateProfile().mutate({ mainGymExtId })` → me 캐시가 갱신되면 RootNavigator 가 자동으로 MainTabs 로 전환.
 * - "나중에 정할게요": `useOnboardingStore.dismiss()` → 같은 분기 조건으로 즉시 MainTabs 전환. 앱 재실행 시 다시 노출.
 * - hardware back: 종료 confirm Alert. 게이트 자체는 풀스크린이고 헤더 없음 (App.tsx 에서 `headerShown=false, gestureEnabled=false`).
 */

const SEARCH_DEBOUNCE_MS = 300;

export default function OnboardingGymScreen(): JSX.Element {
  const theme = useTokens();
  const accessToken = useTokenStore((s) => s.accessToken);
  const dismiss = useOnboardingStore((s) => s.dismiss);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [searchText, setSearchText] = useState<string>('');
  const [debouncedQ, setDebouncedQ] = useState<string>('');
  const [selected, setSelected] = useState<GymItem | null>(null);

  const updateMutation = useUpdateProfile(accessToken);

  // 검색어 디바운스 (ProfileScreen MainGymPickerModal 와 동일 패턴).
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
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGymsQuery(filters);

  const gyms: GymItem[] = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage().catch(() => {
        /* 페이지 실패 무시 */
      });
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const onConfirm = useCallback(() => {
    if (!selected) {
      return;
    }
    updateMutation.mutate(
      { mainGymExtId: selected.extId },
      {
        onError: (err) => {
          // 게이트는 그대로 유지 — 다른 암장 재선택 가능.
          Alert.alert(
            t('onboarding.mainGym.errorTitle'),
            toUserMessage(err),
          );
        },
      },
    );
  }, [selected, updateMutation]);

  const onSkip = useCallback(() => {
    dismiss();
  }, [dismiss]);

  // hardware back: 게이트에서 뒤로가기 누르면 종료 confirm.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        t('onboarding.mainGym.exitConfirmTitle'),
        t('onboarding.mainGym.exitConfirmBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('onboarding.mainGym.exitConfirmCta'),
            style: 'destructive',
            onPress: () => BackHandler.exitApp(),
          },
        ],
      );
      return true;
    });
    return () => sub.remove();
  }, []);

  const saving = updateMutation.isPending;
  const canConfirm = selected !== null && !saving;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('onboarding.mainGym.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.mainGym.subtitle')}</Text>
      </View>

      {/* 검색 입력 */}
      <View style={styles.searchWrap}>
        <View style={styles.searchField}>
          <CrimpIcon.search size={20} color={theme.text3} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder={t('onboarding.mainGym.searchPlaceholder')}
            placeholderTextColor={theme.text4}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel={t('onboarding.mainGym.searchPlaceholder')}
            editable={!saving}
          />
          {searchText.length > 0 && Platform.OS !== 'ios' ? (
            <Pressable
              onPress={() => setSearchText('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('onboarding.mainGym.clearSearch')}
              style={styles.searchClear}
            >
              <CrimpIcon.close size={18} color={theme.text3} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* 결과 영역 */}
      <View style={styles.listWrap}>
        {isLoading ? (
          <View style={styles.skeletonBlock}>
            <Skeleton height={64} radius={radius.lg} />
            <View style={{ height: space[2] }} />
            <Skeleton height={64} radius={radius.lg} />
            <View style={{ height: space[2] }} />
            <Skeleton height={64} radius={radius.lg} />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>
              {t('onboarding.mainGym.searchErrorTitle')}
            </Text>
            <Text style={styles.errorBody}>{toUserMessage(error)}</Text>
          </View>
        ) : (
          <FlatList
            data={gyms}
            keyExtractor={(item) => item.extId}
            ItemSeparatorComponent={ItemSeparator}
            ListEmptyComponent={<EmptyState />}
            contentContainerStyle={
              gyms.length === 0 ? styles.flexContent : styles.listContent
            }
            renderItem={({ item }) => (
              <OnboardingGymRow
                gym={item}
                active={selected?.extId === item.extId}
                disabled={saving}
                onPress={setSelected}
              />
            )}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.3}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
        )}
      </View>

      {/* CTA 영역 */}
      <View style={styles.ctaBlock}>
        <Pressable
          onPress={onConfirm}
          disabled={!canConfirm}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canConfirm }}
          accessibilityLabel={t('onboarding.mainGym.confirmCta')}
          style={({ pressed }) => [
            styles.confirmCta,
            !canConfirm ? styles.confirmCtaDisabled : null,
            pressed && canConfirm ? styles.confirmCtaPressed : null,
          ]}
        >
          {saving ? (
            <ActivityIndicator color={theme.accent.ink} />
          ) : (
            <Text style={styles.confirmLabel}>
              {t('onboarding.mainGym.confirmCta')}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={onSkip}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.mainGym.skipCta')}
          hitSlop={8}
          style={({ pressed }) => [
            styles.skipCta,
            pressed ? styles.skipCtaPressed : null,
          ]}
        >
          <Text style={styles.skipLabel}>
            {t('onboarding.mainGym.skipCta')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// =====================================================================================
// Row · Empty
// =====================================================================================

const OnboardingGymRow = React.memo(function OnboardingGymRow({
  gym,
  active,
  disabled,
  onPress,
}: {
  gym: GymItem;
  active: boolean;
  disabled: boolean;
  onPress: (gym: GymItem) => void;
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

  const handle = useCallback(() => onPress(gym), [gym, onPress]);

  return (
    <Pressable
      onPress={handle}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      accessibilityLabel={a11yParts.join(', ')}
      style={({ pressed }) => [
        styles.row,
        active ? styles.rowActive : null,
        pressed && !disabled ? styles.rowPressed : null,
      ]}
    >
      <View style={styles.rowMain}>
        <Text style={styles.name} numberOfLines={1}>
          {gym.name}
        </Text>
        <Text style={styles.address} numberOfLines={1}>
          {gym.brand ?? gym.address ?? t('gym.list.addressFallback')}
        </Text>
      </View>
      {active ? (
        <CrimpIcon.check size={20} color={theme.accent.ink} />
      ) : null}
    </Pressable>
  );
});

function EmptyState(): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeEmptyStyles(theme), [theme]);
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <CrimpIcon.search size={28} color={theme.text3} />
      </View>
      <Text style={styles.title}>
        {t('onboarding.mainGym.emptyTitle')}
      </Text>
      <Text style={styles.body}>{t('onboarding.mainGym.emptyBody')}</Text>
    </View>
  );
}

function ItemSeparator(): JSX.Element {
  return <View style={separatorStyles.gap} />;
}

const separatorStyles = StyleSheet.create({
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
    header: {
      paddingHorizontal: space[5],
      paddingTop: space[4],
      paddingBottom: space[3],
    },
    title: {
      fontFamily,
      fontSize: fontSize.h1,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.h1,
      color: theme.text,
    },
    subtitle: {
      fontFamily,
      fontSize: fontSize.body,
      color: theme.text2,
      marginTop: space[2],
      lineHeight: fontSize.body * 1.4,
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
      borderRadius: radius.md,
      paddingHorizontal: space[3],
      paddingVertical: Platform.OS === 'ios' ? space[2] : 0,
    },
    searchInput: {
      flex: 1,
      fontFamily,
      fontSize: fontSize.body,
      color: theme.text,
    },
    searchClear: {
      padding: space[1],
    },
    listWrap: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: space[5],
      paddingBottom: space[3],
    },
    flexContent: {
      flexGrow: 1,
      paddingHorizontal: space[5],
      justifyContent: 'center',
    },
    skeletonBlock: {
      paddingHorizontal: space[5],
    },
    errorBox: {
      marginHorizontal: space[5],
      padding: space[4],
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
    },
    errorTitle: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.text,
      marginBottom: space[1],
    },
    errorBody: {
      fontFamily,
      fontSize: fontSize.caption,
      color: theme.text2,
    },
    ctaBlock: {
      paddingHorizontal: space[5],
      paddingTop: space[3],
      paddingBottom: space[3],
      gap: space[3],
    },
    confirmCta: {
      backgroundColor: theme.accent.base,
      borderRadius: radius.lg,
      paddingVertical: space[4],
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmCtaDisabled: {
      opacity: 0.5,
    },
    confirmCtaPressed: {
      opacity: 0.85,
    },
    confirmLabel: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: theme.accent.ink,
    },
    skipCta: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: space[2],
    },
    skipCtaPressed: {
      opacity: 0.6,
    },
    skipLabel: {
      fontFamily,
      fontSize: fontSize.body,
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
      paddingHorizontal: space[3],
      paddingVertical: space[3],
      borderRadius: radius.lg,
      backgroundColor: theme.subtle,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    rowActive: {
      borderColor: theme.accent.base,
      backgroundColor: theme.bg,
    },
    rowPressed: {
      opacity: 0.7,
    },
    rowMain: {
      flex: 1,
    },
    name: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      color: theme.text,
    },
    address: {
      fontFamily,
      fontSize: fontSize.caption,
      color: theme.text3,
      marginTop: 2,
    },
  });
}

function makeEmptyStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: space[6],
    },
    iconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space[3],
    },
    title: {
      fontFamily,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      color: theme.text,
    },
    body: {
      fontFamily,
      fontSize: fontSize.caption,
      color: theme.text3,
      marginTop: space[1],
      textAlign: 'center',
    },
  });
}
