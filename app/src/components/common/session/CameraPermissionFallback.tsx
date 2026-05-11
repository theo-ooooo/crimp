import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { t } from '@/lib/i18n';

import type { CameraSheetStyles } from './CameraSheet';

type CameraPermissionFallbackStyles = Pick<
  CameraSheetStyles,
  | 'fallbackBox'
  | 'fallbackTitle'
  | 'fallbackBody'
  | 'fallbackBtn'
  | 'fallbackBtnLabel'
  | 'fallbackBtnGhost'
  | 'fallbackBtnGhostLabel'
>;

type Props = {
  styles: CameraPermissionFallbackStyles;
  onRetry: () => void;
  onOpenSettings: () => void;
};

export function CameraPermissionFallback({
  styles,
  onRetry,
  onOpenSettings,
}: Props): JSX.Element {
  return (
    <View style={styles.fallbackBox}>
      <Text style={styles.fallbackTitle}>{t('session.log.cameraPermissionTitle')}</Text>
      <Text style={styles.fallbackBody}>{t('session.log.cameraPermissionBody')}</Text>
      <Pressable onPress={onRetry} style={styles.fallbackBtn} accessibilityRole="button">
        <Text style={styles.fallbackBtnLabel}>{t('session.log.cameraPermissionRetry')}</Text>
      </Pressable>
      <Pressable onPress={onOpenSettings} style={styles.fallbackBtnGhost} accessibilityRole="button">
        <Text style={styles.fallbackBtnGhostLabel}>{t('session.log.cameraPermissionSettings')}</Text>
      </Pressable>
    </View>
  );
}
