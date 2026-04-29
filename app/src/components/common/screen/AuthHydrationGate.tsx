import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { t, type MessageKey } from '@/lib/i18n';
import { fontFamily, fontWeight, space } from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';

type Props = {
  hydrated: boolean;
  accessToken: string | null;
  loginTitleKey: MessageKey;
  loginDescriptionKey: MessageKey;
  renderWhenGuest?: () => JSX.Element;
  children: (accessToken: string) => JSX.Element;
};

export function AuthHydrationGate({
  hydrated,
  accessToken,
  loginTitleKey,
  loginDescriptionKey,
  renderWhenGuest,
  children,
}: Props): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        center: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: space[6],
          gap: space[2],
          backgroundColor: theme.bg,
        },
        heading: {
          fontFamily,
          fontSize: 18,
          fontWeight: fontWeight.bold,
          color: theme.text,
        },
        muted: {
          fontFamily,
          fontSize: 14,
          color: theme.text3,
          textAlign: 'center',
        },
      }),
    [theme],
  );

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!accessToken) {
    if (renderWhenGuest) {
      return renderWhenGuest();
    }
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>{t(loginTitleKey)}</Text>
        <Text style={styles.muted}>{t(loginDescriptionKey)}</Text>
      </View>
    );
  }

  return children(accessToken);
}
