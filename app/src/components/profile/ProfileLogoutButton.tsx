import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text } from 'react-native';

import type { ProfileStyles } from '@/components/profile/profileStyles';
import { useLogout } from '@/hooks/queries/useAuth';
import { t } from '@/lib/i18n';

export function ProfileLogoutButton({ styles }: { styles: ProfileStyles }): JSX.Element {
  const logout = useLogout();
  const [pending, setPending] = useState<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const onPress = useCallback(async () => {
    if (pending) {
      return;
    }
    setPending(true);
    try {
      await logout();
    } finally {
      if (mountedRef.current) {
        setPending(false);
      }
    }
  }, [logout, pending]);

  return (
    <Pressable
      onPress={onPress}
      disabled={pending}
      accessibilityRole="button"
      accessibilityLabel={t('profile.logout')}
      style={({ pressed }) => [
        styles.logoutButton,
        pressed ? styles.logoutButtonPressed : null,
        pending ? styles.logoutButtonDisabled : null,
      ]}
    >
      <Text style={styles.logoutButtonLabel}>
        {pending ? t('profile.logoutLoading') : t('profile.logout')}
      </Text>
    </Pressable>
  );
}
