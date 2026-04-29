import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/common/primitives';
import { t } from '@/lib/i18n';
import { toUserMessage } from '@/lib/api/errorMessage';

import { makeStartSessionStyles } from './startSessionStyles';

type Styles = ReturnType<typeof makeStartSessionStyles>;

type Props = {
  styles: Styles;
  gymName: string;
  setGymName: (value: string) => void;
  selectedGymName: string | null;
  hasSelectedGym: boolean;
  clearSelectedGym: () => void;
  onSubmit: () => void;
  isPending: boolean;
  error: Error | null;
  hintText: string;
  accentColor: string;
  text4Color: string;
  backgroundColor: string;
};

export function StartSessionBody({
  styles,
  gymName,
  setGymName,
  selectedGymName,
  hasSelectedGym,
  clearSelectedGym,
  onSubmit,
  isPending,
  error,
  hintText,
  accentColor,
  text4Color,
  backgroundColor,
}: Props): JSX.Element {
  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor }]}
      behavior={Platform.select({ ios: 'padding', android: 'height' })}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{t('session.start.eyebrow')}</Text>
          <Text style={styles.title}>{t('session.start.question')}</Text>
          <Text style={styles.subtitle}>{t('session.start.subtitle')}</Text>
        </View>

        {hasSelectedGym && selectedGymName ? (
          <View
            style={styles.selectedGymCard}
            accessible
            accessibilityRole="summary"
            accessibilityLabel={t('session.start.selectedGymLabel')}
          >
            <View style={styles.selectedGymText}>
              <Text style={styles.selectedGymLabel}>
                {t('session.start.selectedGymLabel')}
              </Text>
              <Text style={styles.selectedGymName} numberOfLines={1}>
                {selectedGymName}
              </Text>
            </View>
            <Pressable
              onPress={clearSelectedGym}
              accessibilityRole="button"
              accessibilityLabel={t('session.start.clearGymCta')}
              style={({ pressed }) => [
                styles.clearButton,
                pressed && styles.clearButtonPressed,
              ]}
              hitSlop={8}
            >
              <Text style={styles.clearButtonLabel}>
                {t('session.start.clearGymCta')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.field}>
            <Text style={styles.label}>{t('session.start.gymNameLabel')}</Text>
            <TextInput
              value={gymName}
              onChangeText={setGymName}
              maxLength={100}
              placeholder={t('session.start.gymNamePlaceholder')}
              placeholderTextColor={text4Color}
              style={styles.input}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={onSubmit}
              accessibilityLabel={t('session.start.gymNameLabel')}
            />
          </View>
        )}

        <Text style={styles.hint}>
          {t('session.start.startedAtLabel')} · {hintText}
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>{t('session.start.errorTitle')}</Text>
            <Text style={styles.errorBody}>{toUserMessage(error)}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bottomBar}>
        {isPending ? (
          <View style={styles.pendingRow}>
            <ActivityIndicator color={accentColor} />
            <Text style={styles.pendingLabel}>{t('session.start.submitting')}</Text>
          </View>
        ) : (
          <PrimaryButton onPress={onSubmit} accessibilityLabel={t('session.start.submit')}>
            {t('session.start.submit')}
          </PrimaryButton>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
