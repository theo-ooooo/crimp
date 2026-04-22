import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useHealthQuery } from '@/hooks/useHealth';
import { t } from '@/lib/i18n';

export default function HomeScreen(): JSX.Element {
  const { data, error, isLoading, isFetching, refetch } = useHealthQuery();

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>{t('common.brand').toUpperCase()}</Text>
      <Text style={styles.title}>{t('home.tagline')}</Text>
      <Text style={styles.body}>{t('home.description')}</Text>

      <View
        style={styles.healthCard}
        accessible
        accessibilityLabel={t('home.healthSectionTitle')}
      >
        <Text style={styles.healthSectionTitle}>
          {t('home.healthSectionTitle')}
        </Text>

        {isLoading ? (
          <View style={styles.inline}>
            <ActivityIndicator color="#ff7a1f" />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        ) : error ? (
          <View>
            <Text style={styles.errorTitle}>{t('home.healthErrorTitle')}</Text>
            <Text style={styles.errorHint}>{t('home.healthErrorHint')}</Text>
            <Text style={styles.errorDetails}>
              {error instanceof Error ? error.message : String(error)}
            </Text>
            <Pressable
              onPress={() => {
                refetch().catch(() => {
                  /* 재시도 실패는 화면 상태가 그대로 유지되므로 별도 처리 없음 */
                });
              }}
              disabled={isFetching}
              style={({ pressed }) => [
                styles.retryButton,
                pressed ? styles.retryButtonPressed : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('common.retry')}
            >
              <Text style={styles.retryLabel}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : data ? (
          <View style={styles.kvList}>
            <KeyValue label={t('home.healthLabelStatus')} value={data.status} />
            <KeyValue label={t('home.healthLabelBrand')} value={data.brand} />
            <KeyValue label={t('home.healthLabelEnv')} value={data.env} />
            <KeyValue
              label={t('home.healthLabelServerTime')}
              value={data.serverTime}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function KeyValue({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0b',
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 12,
  },
  eyebrow: {
    color: '#ff7a1f',
    fontSize: 12,
    letterSpacing: 3,
  },
  title: {
    color: '#f5f5f4',
    fontSize: 28,
    fontWeight: '600',
  },
  body: {
    color: '#a3a3a3',
    fontSize: 14,
    lineHeight: 20,
  },
  healthCard: {
    marginTop: 24,
    borderRadius: 10,
    borderColor: '#262626',
    borderWidth: 1,
    padding: 16,
    backgroundColor: '#111111',
    gap: 10,
  },
  healthSectionTitle: {
    color: '#a3a3a3',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#a3a3a3',
    fontSize: 13,
  },
  errorTitle: {
    color: '#f87171',
    fontSize: 13,
    marginBottom: 2,
  },
  errorHint: {
    color: '#737373',
    fontSize: 12,
  },
  errorDetails: {
    color: '#525252',
    fontSize: 11,
    marginTop: 4,
    fontFamily: 'Menlo',
  },
  retryButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#404040',
  },
  retryButtonPressed: {
    backgroundColor: '#1f1f1f',
  },
  retryLabel: {
    color: '#e5e5e5',
    fontSize: 12,
  },
  kvList: {
    gap: 6,
  },
  kvRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kvLabel: {
    color: '#737373',
    fontSize: 12,
    width: 90,
  },
  kvValue: {
    color: '#d4d4d4',
    fontSize: 12,
    flexShrink: 1,
    fontFamily: 'Menlo',
  },
});
