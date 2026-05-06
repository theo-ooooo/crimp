import { ActivityIndicator, Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';

import { t } from '@/lib/i18n';
import { useTokens } from '@/lib/useTokens';

import { makeMainGymPickerModalStyles } from './mainGymPickerStyles';

type Props = {
  disabled: boolean;
  saving: boolean;
  onConfirm: () => void;
  styles: ReturnType<typeof makeMainGymPickerModalStyles>;
};

export function MainGymPickerActionFooter({
  disabled,
  saving,
  onConfirm,
  styles,
}: Props): JSX.Element {
  const theme = useTokens();
  return (
    <Pressable
      onPress={onConfirm}
      disabled={disabled || saving}
      accessibilityRole="button"
      accessibilityLabel={t('me.mainGym.confirmCta')}
      accessibilityState={{ disabled: disabled || saving }}
      style={({ pressed }) =>
        [
          styles.confirmButton,
          pressed ? styles.confirmButtonPressed : null,
          disabled || saving ? styles.confirmButtonDisabled : null,
        ] as StyleProp<ViewStyle>
      }
    >
      {saving ? <ActivityIndicator color={theme.accent.ink} /> : null}
      <Text style={styles.confirmButtonLabel}>
        {saving ? t('me.mainGym.saving') : t('me.mainGym.confirmCta')}
      </Text>
    </Pressable>
  );
}
