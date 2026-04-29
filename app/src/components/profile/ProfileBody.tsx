import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { CrimpIcon, Skeleton } from '@/components/common/primitives';
import {
  ProfileHeaderRow,
  ProfileStatsRow,
  ProfileTopGradeHero,
} from '@/components/profile/ProfileOverviewSections';
import { ProfileLogoutButton } from './ProfileLogoutButton';
import type { ProfileStyles } from '@/components/profile/profileStyles';
import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import { radius, space, type Theme } from '@/lib/tokens';
import type { Me } from '@/lib/schemas/me';
import type { MeStats } from '@/lib/schemas/meStats';

type Props = {
  styles: ProfileStyles;
  theme: Theme;
  me: Me | null;
  stats: MeStats | null;
  isStatsLoading: boolean;
  isLoading: boolean;
  error: Error | null;
  isRefetching: boolean;
  onRefresh: () => void;
  hasMainGym: boolean;
  mainGymName: string | null;
  mainGymBrand: string | null;
  onOpenPicker: () => void;
  onClearMainGym: () => void;
  isSaving: boolean;
  updateError: Error | null;
};

export function ProfileBody({
  styles,
  theme,
  me,
  stats,
  isStatsLoading,
  isLoading,
  error,
  isRefetching,
  onRefresh,
  hasMainGym,
  mainGymName,
  mainGymBrand,
  onOpenPicker,
  onClearMainGym,
  isSaving,
  updateError,
}: Props): JSX.Element {
  if (isLoading) {
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

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{t('profile.loadErrorTitle')}</Text>
          <Text style={styles.muted}>{toUserMessage(error)}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={theme.text2} />
      }
    >
      <View style={styles.headerEyebrowBlock}>
        <Text style={styles.eyebrow}>{t('profile.title')}</Text>
      </View>
      <ProfileHeaderRow me={me} styles={styles} theme={theme} />
      <ProfileStatsRow stats={stats} loading={isStatsLoading} styles={styles} />
      <ProfileTopGradeHero stats={stats} styles={styles} theme={theme} />

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
                    {mainGymName}
                  </Text>
                  {mainGymBrand ? (
                    <Text style={styles.gymBrand} numberOfLines={1}>
                      {mainGymBrand}
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={[styles.gymLabel, styles.gymLabelMuted]} numberOfLines={1}>
                  {t('me.mainGym.unset')}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.ctaRow}>
          <Pressable
            onPress={onOpenPicker}
            accessibilityRole="button"
            accessibilityLabel={hasMainGym ? t('me.mainGym.editCta') : t('me.mainGym.setCta')}
            style={({ pressed }) => [styles.ctaButton, pressed ? styles.ctaButtonPressed : null]}
          >
            <Text style={styles.ctaButtonLabel}>
              {hasMainGym ? t('me.mainGym.editCta') : t('me.mainGym.setCta')}
            </Text>
          </Pressable>
          {hasMainGym ? (
            <Pressable
              onPress={onClearMainGym}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel={t('me.mainGym.clearCta')}
              style={({ pressed }) => [
                styles.ctaButtonDanger,
                pressed ? styles.ctaButtonPressed : null,
                isSaving ? styles.ctaButtonDisabled : null,
              ]}
            >
              <Text style={styles.ctaButtonDangerLabel}>{t('me.mainGym.clearCta')}</Text>
            </Pressable>
          ) : null}
        </View>

        {isSaving ? (
          <View style={styles.savingRow}>
            <ActivityIndicator color={theme.accent.base} />
            <Text style={styles.muted}>{t('me.mainGym.saving')}</Text>
          </View>
        ) : null}

        {updateError ? (
          <View style={styles.inlineErrorBox}>
            <Text style={styles.inlineErrorTitle}>{t('me.mainGym.errorTitle')}</Text>
            <Text style={styles.muted}>{toUserMessage(updateError)}</Text>
          </View>
        ) : null}
      </View>

      <ProfileLogoutButton styles={styles} />
    </ScrollView>
  );
}
