import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';

import { CrimpIcon, Skeleton } from '@/components/common/primitives';
import { useGymsQuery } from '@/hooks/queries/useGyms';
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

type Props = {
  visible: boolean;
  currentGymExtId: string | null;
  saving: boolean;
  onClose: () => void;
  onSelect: (gym: GymItem) => void;
};

const SEARCH_DEBOUNCE_MS = 300;

export function MainGymPickerModal({
  visible,
  currentGymExtId,
  saving,
  onClose,
  onSelect,
}: Props): JSX.Element {
  const theme = useTokens();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeModalStyles(theme), [theme]);
  const [searchText, setSearchText] = useState<string>('');
  const [debouncedQ, setDebouncedQ] = useState<string>('');

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

  const filters = useMemo(() => ({ q: debouncedQ.length > 0 ? debouncedQ : undefined }), [debouncedQ]);
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

  const gyms: GymItem[] = data?.pages.flatMap((p) => p.items) ?? [];
  const onRefresh = useCallback(() => {
    refetch().catch(() => {});
  }, [refetch]);
  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage().catch(() => {});
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const handleRowPress = useCallback((gym: GymItem) => onSelect(gym), [onSelect]);

  const renderItem = useCallback<ListRenderItem<GymItem>>(
    ({ item }) => (
      <GymPickerRow
        gym={item}
        active={currentGymExtId !== null && item.extId === currentGymExtId}
        onSelect={handleRowPress}
      />
    ),
    [currentGymExtId, handleRowPress],
  );

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
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
        <Pressable style={styles.backdrop} onPress={handleClose} accessibilityLabel={t('me.mainGym.cancel')} />
        <View style={styles.sheet} accessibilityViewIsModal accessibilityLiveRegion="polite">
          <View style={styles.handleBar} />
          <View style={styles.header}>
            <Text style={styles.title}>{t('me.mainGym.pickerTitle')}</Text>
            <Pressable onPress={handleClose} accessibilityRole="button" accessibilityLabel={t('me.mainGym.cancel')} hitSlop={8}>
              <Text style={styles.cancel}>{t('me.mainGym.cancel')}</Text>
            </Pressable>
          </View>

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
              <View style={itemSeparatorStyles.gap} />
              <Skeleton height={64} radius={radius.lg} />
              <View style={itemSeparatorStyles.gap} />
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
              contentContainerStyle={gyms.length === 0 ? [styles.flexContent, styles.content] : styles.content}
              ItemSeparatorComponent={ItemSeparator}
              refreshControl={
                <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={theme.accent.base} />
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
              <Text style={styles.savingFooterText}>{t('me.mainGym.saving')}</Text>
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
  const handlePress = useCallback(() => onSelect(gym), [gym, onSelect]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={a11yParts.join(', ')}
      style={({ pressed }) => [styles.row, active ? styles.rowActive : null, pressed ? styles.rowPressed : null]}
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

const itemSeparatorStyles = StyleSheet.create({ gap: { height: space[2] } });

function makeModalStyles(theme: Theme) {
  return StyleSheet.create({
    root: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: withAlpha(theme.accent.ink, 0.5) },
    sheet: {
      backgroundColor: theme.bg,
      borderTopLeftRadius: radius['2xl'],
      borderTopRightRadius: radius['2xl'],
      paddingTop: space[3],
      paddingBottom: space[10],
      maxHeight: '92%',
      overflow: 'hidden',
    },
    handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.text4, alignSelf: 'center', marginBottom: space[4] },
    header: { paddingHorizontal: space[5], flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: space[3] },
    title: { fontFamily, fontSize: 22, fontWeight: fontWeight.extrabold, color: theme.text, letterSpacing: -0.66 },
    cancel: { fontFamily, fontSize: 14, fontWeight: fontWeight.semibold, color: theme.text3 },
    searchWrap: { paddingHorizontal: space[5], paddingBottom: space[3] },
    searchField: { flexDirection: 'row', alignItems: 'center', gap: space[2], backgroundColor: theme.subtle, borderRadius: radius.lg, paddingHorizontal: space[4], paddingVertical: space[3] },
    searchInput: { flex: 1, fontFamily, fontSize: fontSize.body, fontWeight: fontWeight.medium, color: theme.text, letterSpacing: letterSpacing.body, padding: 0 },
    searchClear: { padding: space[1] },
    content: { paddingHorizontal: space[5], paddingBottom: space[6] },
    flexContent: { flexGrow: 1 },
    errorBox: { marginHorizontal: space[5], backgroundColor: withAlpha(theme.semantic.danger, 0.08), borderRadius: radius.lg, padding: space[4], gap: space[1] },
    errorTitle: { fontFamily, fontSize: fontSize.body, fontWeight: fontWeight.bold, color: theme.semantic.danger },
    errorBody: { fontFamily, fontSize: 13, color: theme.text2 },
    footer: { paddingVertical: space[4], alignItems: 'center' },
    savingFooter: { flexDirection: 'row', gap: space[2], alignItems: 'center', justifyContent: 'center', paddingVertical: space[3], paddingHorizontal: space[5] },
    savingFooterText: { fontFamily, fontSize: fontSize.caption, color: theme.text3 },
  });
}

function makeRowStyles(theme: Theme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: theme.subtle },
    rowActive: { backgroundColor: theme.accent.soft },
    rowPressed: { opacity: 0.85 },
    rowMain: { flex: 1, gap: 2, minWidth: 0 },
    name: { fontFamily, fontSize: fontSize.body, fontWeight: fontWeight.bold, color: theme.text, letterSpacing: letterSpacing.body },
    address: { fontFamily, fontSize: fontSize.caption, fontWeight: fontWeight.medium, color: theme.text3 },
  });
}

function makeEmptyStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6], gap: space[2] },
    iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.subtle, alignItems: 'center', justifyContent: 'center', marginBottom: space[2] },
    title: { fontFamily, fontSize: fontSize.title, fontWeight: fontWeight.extrabold, color: theme.text, letterSpacing: letterSpacing.title, textAlign: 'center' },
    body: { fontFamily, fontSize: 14, fontWeight: fontWeight.medium, color: theme.text3, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  });
}
