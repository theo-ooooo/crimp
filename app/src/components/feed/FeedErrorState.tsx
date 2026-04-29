import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { toUserMessage } from '@/lib/api/errorMessage';
import { t } from '@/lib/i18n';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useTokens } from '@/lib/useTokens';

import { makeFeedErrorStyles } from './feedScreenStyles';

type FeedErrorStateProps = {
  error: Error;
  onRetry: () => void;
};

export function FeedErrorState({
  error,
  onRetry,
}: FeedErrorStateProps): JSX.Element {
  const theme = useTokens();
  const reducedMotion = useReducedMotion();
  const styles = useMemo(() => makeFeedErrorStyles(theme), [theme]);

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{t('feed.errorTitle')}</Text>
      <Text style={styles.body}>{toUserMessage(error)}</Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={t('common.retry')}
        style={({ pressed }) => [
          styles.retry,
          pressed && !reducedMotion ? styles.retryPressed : null,
        ]}
      >
        <Text style={styles.retryLabel}>{t('common.retry')}</Text>
      </Pressable>
    </View>
  );
}
