import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { CrimpIcon, Skeleton } from '@/components/common/primitives';
import { t } from '@/lib/i18n';
import { space, type Theme } from '@/lib/tokens';
import type { Me } from '@/lib/schemas/me';
import type { MeStats } from '@/lib/schemas/meStats';

import type { ProfileStyles } from '@/components/profile/profileStyles';

type HeaderProps = {
  me: Me | null;
  styles: ProfileStyles;
  theme: Theme;
  onEditProfile: () => void;
};

export function ProfileHeaderRow({
  me,
  styles,
  theme,
  onEditProfile,
}: HeaderProps): JSX.Element {
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
        <View style={styles.nicknameRow}>
          <Text style={styles.nickname} numberOfLines={1}>
            {nickname}
          </Text>
          <Pressable
            onPress={onEditProfile}
            accessibilityRole="button"
            accessibilityLabel={t('profile.edit.cta')}
            style={({ pressed }) => [
              styles.editIconButton,
              pressed ? styles.ctaButtonPressed : null,
            ]}
          >
            <CrimpIcon.edit size={18} color={theme.text2} />
          </Pressable>
        </View>
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

type StatsProps = {
  stats: MeStats | null;
  loading: boolean;
  styles: ProfileStyles;
};

export function ProfileStatsRow({
  stats,
  loading,
  styles,
}: StatsProps): JSX.Element {
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
      <StatPill
        value={stats.totalSends}
        label={t('profile.statTotalSends')}
        styles={styles}
      />
      <StatPill
        value={stats.totalSessions}
        label={t('profile.statTotalSessions')}
        styles={styles}
      />
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
  styles: ProfileStyles;
}): JSX.Element {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillValue}>{String(value)}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

type HeroProps = {
  stats: MeStats | null;
  styles: ProfileStyles;
  theme: Theme;
};

export function ProfileTopGradeHero({
  stats,
  styles,
  theme,
}: HeroProps): JSX.Element {
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
          <Text style={styles.heroSubtext}>{t('profile.topGradeEmptyHint')}</Text>
        ) : null}
      </View>
    </View>
  );
}
