import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { CrimpIcon } from '@/components/common/primitives';
import { t } from '@/lib/i18n';
import { useTokens } from '@/lib/useTokens';

import { makeMainGymPickerEmptyStyles } from './mainGymPickerStyles';

export function MainGymPickerEmptyState(): JSX.Element {
  const theme = useTokens();
  const styles = useMemo(() => makeMainGymPickerEmptyStyles(theme), [theme]);
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <CrimpIcon.search size={32} color={theme.text3} />
      </View>
      <Text style={styles.title}>{t('gym.list.emptyTitle')}</Text>
      <Text style={styles.body}>{t('gym.list.emptyBody')}</Text>
    </View>
  );
}
