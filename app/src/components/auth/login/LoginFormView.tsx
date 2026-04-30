import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppleLoginButton } from '@/components/auth/AppleLoginButton';
import { KakaoLoginButton } from '@/components/auth/KakaoLoginButton';
import { CrimpLogo, SecondaryButton } from '@/components/common/primitives';
import { t } from '@/lib/i18n';
import type { Theme } from '@/lib/tokens';

import type { LoginStyles } from './loginStyles';

type Props = {
  styles: LoginStyles;
  theme: Theme;
  isKakaoLinked: boolean;
  isAppleLinked: boolean;
  isPending: boolean;
  errorMessage: string | null;
  devOpen: boolean;
  devToken: string;
  setDevOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setDevToken: React.Dispatch<React.SetStateAction<string>>;
  onDevSubmit: () => Promise<void>;
  onKakaoPress: () => Promise<void>;
  onApplePress: () => Promise<void>;
};

export function LoginFormView({
  styles,
  theme,
  isKakaoLinked,
  isAppleLinked,
  isPending,
  errorMessage,
  devOpen,
  devToken,
  setDevOpen,
  setDevToken,
  onDevSubmit,
  onKakaoPress,
  onApplePress,
}: Props): JSX.Element {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.heroBlock}>
          <View style={styles.brandLogoWrap}>
            <CrimpLogo
              variant="wordmark"
              width={140}
              color={theme.text}
              textColor={theme.accent.base}
            />
          </View>
          <Text style={styles.headline}>
            {t('auth.login.headlineLine1')}
            {'\n'}
            {t('auth.login.headlineLine2')}
          </Text>
          <Text style={styles.subDescription}>{t('auth.login.subDescription')}</Text>
        </View>

        {!isKakaoLinked ? (
          <View style={styles.noticeCard} accessibilityRole="alert">
            <Text style={styles.noticeTitle}>{t('auth.login.nativeUnlinkedTitle')}</Text>
            <Text style={styles.noticeBody}>{t('auth.login.nativeUnlinkedBody')}</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorCard} accessibilityRole="alert">
            <Text style={styles.errorTitle}>{t('auth.login.errorTitle')}</Text>
            <Text style={styles.errorBody}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.devSection}>
          <Pressable
            onPress={() => setDevOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={t('auth.login.devModeToggle')}
            accessibilityState={{ expanded: devOpen }}
            style={({ pressed }) => [
              styles.devToggle,
              pressed ? styles.devTogglePressed : null,
            ]}
          >
            <Text style={styles.devToggleLabel}>
              {devOpen ? t('auth.login.devModeHide') : t('auth.login.devModeToggle')}
            </Text>
          </Pressable>

          {devOpen ? (
            <View style={styles.devPanel}>
              <Text style={styles.devHint}>{t('auth.login.devModeHint')}</Text>
              <Text style={styles.devLabel}>{t('auth.login.devTokenLabel')}</Text>
              <TextInput
                value={devToken}
                onChangeText={setDevToken}
                placeholder={t('auth.login.devTokenPlaceholder')}
                placeholderTextColor={theme.text4}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                style={styles.devInput}
                accessibilityLabel={t('auth.login.devTokenLabel')}
              />
              <View style={styles.devSubmit}>
                <SecondaryButton
                  onPress={() => {
                    onDevSubmit().catch(() => {
                      /* errorMessage 상태로 노출 */
                    });
                  }}
                  disabled={isPending || devToken.trim().length === 0}
                  accessibilityLabel={t('auth.login.devSubmit')}
                >
                  {t('auth.login.devSubmit')}
                </SecondaryButton>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.bottomCta}>
        <KakaoLoginButton
          onPress={() => {
            onKakaoPress().catch(() => {
              /* errorMessage 상태로 노출 */
            });
          }}
          loading={isPending}
          accessibilityLabel={t('auth.login.kakaoCta')}
        />
        {/* [PR #104, F-D3] Apple Sign In 버튼 — iOS 만 노출. AppleLoginButton 내부에서
            Platform.OS !== 'ios' 면 null 반환. isAppleLinked 가 false (lib 미연결 또는
            isSupported=false) 면 그릴 필요 없으므로 conditional rendering. */}
        {isAppleLinked ? (
          <AppleLoginButton
            onPress={() => {
              onApplePress().catch(() => {
                /* errorMessage 상태로 노출 */
              });
            }}
            loading={isPending}
            accessibilityLabel={t('auth.login.appleCta')}
          />
        ) : null}
        <Text style={styles.termsNotice}>{t('auth.login.termsNotice')}</Text>
      </View>
    </SafeAreaView>
  );
}
