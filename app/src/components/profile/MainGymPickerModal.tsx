import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CrimpIcon, Skeleton } from '@/components/common/primitives';
import { MainGymPickerActionFooter } from '@/components/profile/MainGymPickerActionFooter';
import { MainGymPickerEmptyState } from '@/components/profile/MainGymPickerEmptyState';
import { MainGymPickerRow } from '@/components/profile/MainGymPickerRow';
import { MainGymPickerSeparator } from '@/components/profile/MainGymPickerSeparator';
import {
  mainGymPickerSeparatorStyles,
  makeMainGymPickerModalStyles,
} from '@/components/profile/mainGymPickerStyles';
import { useGymsQuery } from '@/hooks/queries/useGyms';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import { radius, space } from '@/lib/tokens';
import type { GymItem } from '@/lib/schemas/gym';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTokens } from '@/lib/useTokens';

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
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeMainGymPickerModalStyles(theme), [theme]);
  const [searchText, setSearchText] = useState<string>('');
  const [debouncedQ, setDebouncedQ] = useState<string>('');
  const [selectedGym, setSelectedGym] = useState<GymItem | null>(null);

  useEffect(() => {
    if (!visible) {
      setSearchText('');
      setDebouncedQ('');
      setSelectedGym(null);
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

  const gyms: GymItem[] = data?.pages.flatMap((p) => p.items) ?? [];
  const selectedExtId = selectedGym?.extId ?? currentGymExtId;
  const canConfirm =
    selectedGym !== null && selectedGym.extId !== currentGymExtId && !saving;

  const onRefresh = useCallback(() => {
    refetch().catch(() => {});
  }, [refetch]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage().catch(() => {});
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleConfirm = useCallback(() => {
    if (canConfirm && selectedGym) {
      onSelect(selectedGym);
    }
  }, [canConfirm, onSelect, selectedGym]);

  const renderItem = useCallback<ListRenderItem<GymItem>>(
    ({ item }) => (
      <MainGymPickerRow
        gym={item}
        active={selectedExtId !== null && item.extId === selectedExtId}
        onSelect={setSelectedGym}
      />
    ),
    [selectedExtId],
  );

  const handleClose = useCallback(() => {
    if (!saving) {
      onClose();
    }
  }, [onClose, saving]);

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
        <View style={styles.sheet} accessibilityViewIsModal accessibilityLiveRegion="polite">
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
              <View style={mainGymPickerSeparatorStyles.gap} />
              <Skeleton height={64} radius={radius.lg} />
              <View style={mainGymPickerSeparatorStyles.gap} />
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
                gyms.length === 0 ? [styles.flexContent, styles.content] : styles.content
              }
              ItemSeparatorComponent={MainGymPickerSeparator}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={onRefresh}
                  tintColor={theme.accent.base}
                />
              }
              ListEmptyComponent={<MainGymPickerEmptyState />}
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

          <View
            style={[
              styles.actionFooter,
              { paddingBottom: Math.max(insets.bottom, space[5]) },
            ]}
          >
            <MainGymPickerActionFooter
              disabled={!canConfirm}
              saving={saving}
              onConfirm={handleConfirm}
              styles={styles}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
