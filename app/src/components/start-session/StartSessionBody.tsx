import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';

import { CrimpIcon, PrimaryButton, Skeleton } from '@/components/common/primitives';
import { OnboardingGymRow } from '@/components/onboarding-gym/OnboardingGymRow';
import { t } from '@/lib/i18n';
import { toUserMessage } from '@/lib/api/errorMessage';
import type { GymItem } from '@/lib/schemas/gym';
import type { StartSessionGymChoice } from '@/hooks/screens/useStartSessionScreen';
import { radius, space } from '@/lib/tokens';

import { makeStartSessionStyles } from './startSessionStyles';

type Styles = ReturnType<typeof makeStartSessionStyles>;

type Props = {
  styles: Styles;
  mainGym: StartSessionGymChoice | null;
  activeGym: StartSessionGymChoice | null;
  selectedGymName: string | null;
  hasSelectedGym: boolean;
  searchMode: boolean;
  searchText: string;
  setSearchText: (value: string) => void;
  gyms: GymItem[];
  gymSearchLoading: boolean;
  gymSearchFetchingNext: boolean;
  gymSearchRefreshing: boolean;
  gymSearchHasMore: boolean;
  gymSearchError: Error | null;
  canSubmit: boolean;
  clearSelectedGym: () => void;
  useOtherGym: () => void;
  useMainGym: () => void;
  onSelectGym: (gym: GymItem) => void;
  onEndReached: () => void;
  refreshGyms: () => void;
  onSubmit: () => void;
  isPending: boolean;
  error: Error | null;
  hintText: string;
  accentColor: string;
  text4Color: string;
  backgroundColor: string;
};

export function StartSessionBody({
  styles,
  mainGym,
  activeGym,
  selectedGymName,
  hasSelectedGym,
  searchMode,
  searchText,
  setSearchText,
  gyms,
  gymSearchLoading,
  gymSearchFetchingNext,
  gymSearchRefreshing,
  gymSearchHasMore,
  gymSearchError,
  canSubmit,
  clearSelectedGym,
  useOtherGym,
  useMainGym,
  onSelectGym,
  onEndReached,
  refreshGyms,
  onSubmit,
  isPending,
  error,
  hintText,
  accentColor,
  text4Color,
  backgroundColor,
}: Props): JSX.Element {
  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor }]}
      behavior={Platform.select({ ios: 'padding', android: 'height' })}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{t('session.start.eyebrow')}</Text>
          <Text style={styles.title}>{t('session.start.question')}</Text>
          <Text style={styles.subtitle}>{t('session.start.subtitle')}</Text>
        </View>

        {!searchMode && hasSelectedGym && selectedGymName ? (
          <View
            style={styles.selectedGymCard}
            accessible
            accessibilityRole="summary"
            accessibilityLabel={t('session.start.selectedGymLabel')}
          >
            <View style={styles.selectedGymText}>
              <Text style={styles.selectedGymLabel}>
                {t('session.start.selectedGymLabel')}
              </Text>
              <Text style={styles.selectedGymName} numberOfLines={1}>
                {selectedGymName}
              </Text>
              {activeGym?.brand ? (
                <Text style={styles.selectedGymMeta} numberOfLines={1}>
                  {activeGym.brand}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={mainGym && activeGym?.extId !== mainGym.extId ? clearSelectedGym : useOtherGym}
              accessibilityRole="button"
              accessibilityLabel={t('session.start.useOtherGymCta')}
              style={({ pressed }) => [
                styles.clearButton,
                pressed && styles.clearButtonPressed,
              ]}
              hitSlop={8}
            >
              <Text style={styles.clearButtonLabel}>
                {t('session.start.useOtherGymCta')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.searchPanel}>
            {mainGym ? (
              <Pressable
                onPress={useMainGym}
                accessibilityRole="button"
                accessibilityLabel={t('session.start.useMainGymCta')}
                style={({ pressed }) => [
                  styles.mainGymButton,
                  pressed ? styles.mainGymButtonPressed : null,
                ]}
              >
                <View style={styles.selectedGymText}>
                  <Text style={styles.selectedGymLabel}>{t('session.start.mainGymLabel')}</Text>
                  <Text style={styles.selectedGymName} numberOfLines={1}>
                    {mainGym.name}
                  </Text>
                </View>
                <CrimpIcon.check size={18} color={accentColor} />
              </Pressable>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>{t('session.start.gymNameLabel')}</Text>
              <View style={styles.searchField}>
                <CrimpIcon.search size={20} color={text4Color} />
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  maxLength={100}
                  placeholder={t('session.start.gymNamePlaceholder')}
                  placeholderTextColor={text4Color}
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={onSubmit}
                  clearButtonMode="while-editing"
                  accessibilityLabel={t('session.start.gymNameLabel')}
                />
                {searchText.length > 0 && Platform.OS !== 'ios' ? (
                  <Pressable
                    onPress={() => setSearchText('')}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t('gym.list.searchClearLabel')}
                    style={styles.searchClear}
                  >
                    <CrimpIcon.close size={18} color={text4Color} />
                  </Pressable>
                ) : null}
              </View>
            </View>

            <GymSearchResults
              styles={styles}
              gyms={gyms}
              activeExtId={activeGym?.extId ?? null}
              loading={gymSearchLoading}
              fetchingNext={gymSearchFetchingNext}
              refreshing={gymSearchRefreshing}
              hasMore={gymSearchHasMore}
              error={gymSearchError}
              accentColor={accentColor}
              onSelectGym={onSelectGym}
              onEndReached={onEndReached}
              refreshGyms={refreshGyms}
            />
          </View>
        )}

        <Text style={styles.hint}>
          {t('session.start.startedAtLabel')} · {hintText}
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>{t('session.start.errorTitle')}</Text>
            <Text style={styles.errorBody}>{toUserMessage(error)}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bottomBar}>
        {isPending ? (
          <View style={styles.pendingRow}>
            <ActivityIndicator color={accentColor} />
            <Text style={styles.pendingLabel}>{t('session.start.submitting')}</Text>
          </View>
        ) : (
          <PrimaryButton
            onPress={onSubmit}
            disabled={!canSubmit}
            accessibilityLabel={t('session.start.submit')}
          >
            {t('session.start.submit')}
          </PrimaryButton>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function GymSearchResults({
  styles,
  gyms,
  activeExtId,
  loading,
  fetchingNext,
  refreshing,
  hasMore,
  error,
  accentColor,
  onSelectGym,
  onEndReached,
  refreshGyms,
}: {
  styles: Styles;
  gyms: GymItem[];
  activeExtId: string | null;
  loading: boolean;
  fetchingNext: boolean;
  refreshing: boolean;
  hasMore: boolean;
  error: Error | null;
  accentColor: string;
  onSelectGym: (gym: GymItem) => void;
  onEndReached: () => void;
  refreshGyms: () => void;
}): JSX.Element {
  const renderItem: ListRenderItem<GymItem> = ({ item }) => (
    <OnboardingGymRow
      gym={item}
      active={activeExtId === item.extId}
      disabled={false}
      onPress={onSelectGym}
    />
  );

  if (loading) {
    return (
      <View style={styles.skeletonBlock}>
        <Skeleton height={64} radius={radius.lg} />
        <View style={separatorStyles.gap} />
        <Skeleton height={64} radius={radius.lg} />
        <View style={separatorStyles.gap} />
        <Skeleton height={64} radius={radius.lg} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorTitle}>{t('gym.list.errorTitle')}</Text>
        <Text style={styles.errorBody}>{toUserMessage(error)}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={gyms}
      keyExtractor={(item) => item.extId}
      renderItem={renderItem}
      ItemSeparatorComponent={ItemSeparator}
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>{t('session.start.emptyGymTitle')}</Text>
          <Text style={styles.emptyBody}>{t('session.start.emptyGymBody')}</Text>
        </View>
      }
      contentContainerStyle={gyms.length === 0 ? styles.flexContent : styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refreshGyms} tintColor={accentColor} />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={false}
      ListFooterComponent={
        fetchingNext ? (
          <View style={styles.footer}>
            <ActivityIndicator color={accentColor} />
          </View>
        ) : hasMore ? (
          <Pressable
            onPress={onEndReached}
            accessibilityRole="button"
            accessibilityLabel={t('session.list.loadMore')}
            style={({ pressed }) => [
              styles.loadMoreButton,
              pressed ? styles.loadMoreButtonPressed : null,
            ]}
          >
            <Text style={styles.loadMoreLabel}>{t('session.list.loadMore')}</Text>
          </Pressable>
        ) : null
      }
    />
  );
}

function ItemSeparator(): JSX.Element {
  return <View style={separatorStyles.gap} />;
}

const separatorStyles = {
  gap: { height: space[2] },
};
