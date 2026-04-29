import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CrimpIcon, Skeleton } from '@/components/common/primitives';
import { OnboardingGymEmptyState } from '@/components/onboarding-gym/OnboardingGymEmptyState';
import { OnboardingGymRow } from '@/components/onboarding-gym/OnboardingGymRow';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import { radius, space } from '@/lib/tokens';
import type { GymItem } from '@/lib/schemas/gym';

import { makeOnboardingGymStyles } from './onboardingGymStyles';

type Props = {
  styles: ReturnType<typeof makeOnboardingGymStyles>;
  text3Color: string;
  text4Color: string;
  accentInkColor: string;
  searchText: string;
  setSearchText: (value: string) => void;
  gyms: GymItem[];
  selectedExtId: string | null;
  onSelectGym: (gym: GymItem) => void;
  isLoading: boolean;
  error: Error | null;
  saving: boolean;
  canConfirm: boolean;
  onConfirm: () => void;
  onSkip: () => void;
  onEndReached: () => void;
};

export function OnboardingGymBody({
  styles,
  text3Color,
  text4Color,
  accentInkColor,
  searchText,
  setSearchText,
  gyms,
  selectedExtId,
  onSelectGym,
  isLoading,
  error,
  saving,
  canConfirm,
  onConfirm,
  onSkip,
  onEndReached,
}: Props): JSX.Element {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('onboarding.mainGym.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.mainGym.subtitle')}</Text>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchField}>
          <CrimpIcon.search size={20} color={text3Color} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder={t('onboarding.mainGym.searchPlaceholder')}
            placeholderTextColor={text4Color}
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
              <CrimpIcon.close size={18} color={text3Color} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.listWrap}>
        {isLoading ? (
          <View style={styles.skeletonBlock}>
            <Skeleton height={64} radius={radius.lg} />
            <View style={separatorStyles.gap} />
            <Skeleton height={64} radius={radius.lg} />
            <View style={separatorStyles.gap} />
            <Skeleton height={64} radius={radius.lg} />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>{t('onboarding.mainGym.searchErrorTitle')}</Text>
            <Text style={styles.errorBody}>{toUserMessage(error)}</Text>
          </View>
        ) : (
          <FlatList
            data={gyms}
            keyExtractor={(item) => item.extId}
            ItemSeparatorComponent={ItemSeparator}
            ListEmptyComponent={<OnboardingGymEmptyState />}
            contentContainerStyle={gyms.length === 0 ? styles.flexContent : styles.listContent}
            renderItem={({ item }) => (
              <OnboardingGymRow
                gym={item}
                active={selectedExtId === item.extId}
                disabled={saving}
                onPress={onSelectGym}
              />
            )}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.3}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
        )}
      </View>

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
            <ActivityIndicator color={accentInkColor} />
          ) : (
            <Text style={styles.confirmLabel}>{t('onboarding.mainGym.confirmCta')}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={onSkip}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.mainGym.skipCta')}
          hitSlop={8}
          style={({ pressed }) => [styles.skipCta, pressed ? styles.skipCtaPressed : null]}
        >
          <Text style={styles.skipLabel}>{t('onboarding.mainGym.skipCta')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ItemSeparator(): JSX.Element {
  return <View style={separatorStyles.gap} />;
}

const separatorStyles = StyleSheet.create({
  gap: { height: space[2] },
});
