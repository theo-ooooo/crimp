import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>CRIMP</Text>
      <Text style={styles.title}>클라이머를 위한 디지털 홈</Text>
      <Text style={styles.body}>
        암장·루트·등반 로그·크루·아웃도어를 한 곳에서.
      </Text>
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
});
