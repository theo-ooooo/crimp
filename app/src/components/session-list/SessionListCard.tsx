import React, { useMemo } from 'react';
import { Pressable, Text, View, type PressableStateCallbackType, type ViewStyle } from 'react-native';

import { ResultMark } from '@/components/common/primitives';
import { t } from '@/lib/i18n';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTokens } from '@/lib/useTokens';
import type { Session } from '@/lib/schemas/session';
import type { Theme } from '@/lib/tokens';

import { makeSessionCardStyles } from './sessionListStyles';
import {
  formatSessionDateTime,
  formatSessionDurationA11y,
  formatSessionDurationShort,
} from './sessionListUtils';

export function SessionListCard({
  session,
  onPress,
}: {
  session: Session;
  onPress: () => void;
}): JSX.Element {
  const theme: Theme = useTokens();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeSessionCardStyles(theme), [theme]);
  const ended = Boolean(session.endedAt);

  const renderContent = ({ pressed }: PressableStateCallbackType) => {
    const pressedStyle: ViewStyle | null =
      pressed && !reducedMotion ? styles.pressed : null;
    return (
      <View style={[styles.card, pressedStyle]}>
        <View style={styles.left}>
          <Text style={styles.durationLabel}>
            {ended
              ? t('session.list.itemDurationLabelEnded')
              : t('session.list.itemDurationLabelOngoing')}
          </Text>
          <Text
            style={styles.durationValue}
            accessibilityLabel={formatSessionDurationA11y(session.durationMin, ended)}
          >
            {formatSessionDurationShort(session.durationMin, ended)}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.gymName} numberOfLines={1}>
            {session.gymNameRaw ?? t('session.list.itemGymFallback')}
          </Text>
          <Text style={styles.startTime} numberOfLines={1}>
            {formatSessionDateTime(session.startedAt)}
          </Text>
          <View style={styles.badgeRow}>
            {ended ? <ResultMark kind="SEND" size={20} /> : <View style={styles.liveDot} />}
            <Text
              style={[
                styles.badgeLabel,
                {
                  color: ended ? theme.text3 : theme.accent.ink,
                },
              ]}
            >
              {ended ? t('session.detail.endedBadge') : t('session.detail.ongoingBadge')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={session.gymNameRaw ?? t('session.list.itemGymFallback')}
    >
      {renderContent}
    </Pressable>
  );
}
