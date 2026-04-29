import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import { CrimpIcon, PrimaryButton } from '@/components/common/primitives';
import { t } from '@/lib/i18n';
import { useTokens } from '@/lib/useTokens';

import { makeSessionListEmptyStyles } from './sessionListStyles';

export function SessionListEmptyState({
  onStart,
}: {
  onStart: () => void;
}): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeSessionListEmptyStyles(theme), [theme]);
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <CrimpIcon.feed size={40} color={theme.text3} />
      </View>
      <Text style={styles.title}>{t('session.list.emptyTitle')}</Text>
      <Text style={styles.body}>{t('session.list.empty')}</Text>
      <View style={styles.cta}>
        <PrimaryButton onPress={onStart}>{t('session.list.emptyCta')}</PrimaryButton>
      </View>
    </View>
  );
}
