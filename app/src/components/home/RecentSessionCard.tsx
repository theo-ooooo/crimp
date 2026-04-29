import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { CrimpIcon } from '@/components/common/primitives';
import { t } from '@/lib/i18n';
import type { Theme } from '@/lib/tokens';
import type { Session } from '@/lib/schemas/session';

import { makeHomeStyles } from './homeStyles';

type Styles = ReturnType<typeof makeHomeStyles>;

type Props = {
  session: Session;
  onPress: () => void;
  styles: Styles;
  theme: Theme;
};

export function RecentSessionCard({
  session,
  onPress,
  styles,
  theme,
}: Props): JSX.Element {
  const label = session.gymNameRaw ?? t('session.list.itemGymFallback');
  const parsed = new Date(session.startedAt);
  const startedAt = Number.isNaN(parsed.getTime())
    ? t('common.empty')
    : parsed.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.recentCard,
        pressed ? styles.recentCardPressed : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.recentCardIcon}>
        <CrimpIcon.pin size={20} color={theme.text3} />
      </View>
      <View style={styles.recentCardBody}>
        <Text style={styles.recentCardLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.recentCardDate} numberOfLines={1}>
          {startedAt}
        </Text>
      </View>
    </Pressable>
  );
}
