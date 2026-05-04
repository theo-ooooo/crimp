import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import React, { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Config from 'react-native-config';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import { CrimpIcon } from '@/components/common/primitives';
import { radius, shadow, space } from '@/lib/tokens';
import { useTokens } from '@/lib/useTokens';
import type { RootStackNavigationProp, RootStackParamList } from '@/navigation/types';

type GymMapRoute = RouteProp<RootStackParamList, 'GymMap'>;
type GymMapNavigation = RootStackNavigationProp<'GymMap'>;
type GymMapItem = RootStackParamList['GymMap']['gyms'][number];

type MapPoint = {
  key: string;
  label: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  distanceMeters: number | null;
};

export default function GymMapScreen(): JSX.Element {
  const theme = useTokens();
  const route = useRoute<GymMapRoute>();
  const navigation = useNavigation<GymMapNavigation>();
  const webViewRef = useRef<WebView>(null);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const points = useMemo<MapPoint[]>(
    () => route.params.gyms
      .filter((gym) => gym.lat !== null && gym.lng !== null)
      .map((gym, index) => ({
        key: gym.extId,
        label: gym.name.slice(0, 1) || 'G',
        name: gym.name,
        address: gym.address,
        lat: gym.lat as number,
        lng: gym.lng as number,
        distanceMeters: gym.distanceMeters,
        active: index === 0,
      })),
    [route.params.gyms],
  );
  const [selectedExtId, setSelectedExtId] = useState<string | null>(points[0]?.key ?? null);
  const selected = useMemo(
    () => route.params.gyms.find((gym) => gym.extId === selectedExtId) ?? route.params.gyms[0] ?? null,
    [route.params.gyms, selectedExtId],
  );
  const selectedIndex = selected
    ? Math.max(0, route.params.gyms.findIndex((gym) => gym.extId === selected.extId))
    : -1;
  const mapKey = Config.KAKAO_MAP_JS_KEY ?? '';
  const baseUrl = normalizeKakaoMapBaseUrl(Config.KAKAO_MAP_BASE_URL);
  const mapHtml = useMemo(
    () => buildKakaoMapHtml({
      appKey: mapKey,
      points,
      centerLat: averageCoordinate(points, 'lat'),
      centerLng: averageCoordinate(points, 'lng'),
      accentColor: theme.accent.base,
      textColor: theme.text,
    }),
    [mapKey, points, theme.accent.base, theme.text],
  );

  const handleMessage = (data: string) => {
    try {
      const message = JSON.parse(data) as { type?: string; key?: string; payload?: unknown };
      if (message.type === 'marker-press' && message.key) {
        setSelectedExtId(message.key);
      } else if (__DEV__ && message.type && message.type !== 'tilesloaded') {
        console.warn('[gym-map/full]', data);
      }
    } catch {
      if (__DEV__) {
        console.warn('[gym-map/full] invalid message', data);
      }
    }
  };
  const postMapCommand = (type: 'zoom-in' | 'zoom-out') => {
    webViewRef.current?.postMessage(JSON.stringify({ type }));
  };

  return (
    <View style={styles.container}>
      {mapKey ? (
        <WebView
          ref={webViewRef}
          style={StyleSheet.absoluteFill}
          source={{ html: mapHtml, baseUrl }}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          mixedContentMode="always"
          onMessage={(event) => handleMessage(event.nativeEvent.data)}
        />
      ) : (
        <View style={styles.emptyMap}>
          <Text style={styles.emptyText}>Kakao map key missing</Text>
        </View>
      )}

      <SafeAreaView pointerEvents="box-none" style={StyleSheet.absoluteFill} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
            style={styles.iconButton}
          >
            <CrimpIcon.chevL size={24} color={theme.text} />
          </Pressable>
          <View style={styles.titlePill}>
            <Text style={styles.title}>암장 지도</Text>
            <Text style={styles.count}>{points.length}곳</Text>
          </View>
        </View>

        <View style={styles.zoomControls}>
          <Pressable
            onPress={() => postMapCommand('zoom-in')}
            accessibilityRole="button"
            accessibilityLabel="지도 확대"
            style={styles.zoomButton}
          >
            <Text style={styles.zoomText}>+</Text>
          </Pressable>
          <View style={styles.zoomDivider} />
          <Pressable
            onPress={() => postMapCommand('zoom-out')}
            accessibilityRole="button"
            accessibilityLabel="지도 축소"
            style={styles.zoomButton}
          >
            <Text style={styles.zoomText}>-</Text>
          </Pressable>
        </View>

        {selected ? (
          <View style={styles.bottomCard}>
            <Pressable
              onPress={() => navigation.navigate('GymDetail', { extId: selected.extId })}
              accessibilityRole="button"
              style={styles.cardPressable}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{selected.name.slice(0, 1)}</Text>
              </View>
              <View style={styles.cardText}>
                <Text numberOfLines={1} style={styles.gymName}>{selected.name}</Text>
                <Text numberOfLines={1} style={styles.address}>{selected.address ?? '주소 정보 없음'}</Text>
                <Text style={styles.meta}>
                  {selectedIndex + 1}/{route.params.gyms.length}
                  {formatDistance(selected.distanceMeters) ? ` · ${formatDistance(selected.distanceMeters)}` : ''}
                </Text>
              </View>
              <CrimpIcon.chevR size={20} color={theme.text2} />
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

function normalizeKakaoMapBaseUrl(value?: string): string {
  const baseUrl = value && value.length > 0 ? value : 'http://localhost:8081';
  if (Platform.OS !== 'ios') {
    return baseUrl;
  }
  return baseUrl.replace(/^http:\/\//, 'https://');
}

function averageCoordinate(points: MapPoint[], key: 'lat' | 'lng'): number {
  if (points.length === 0) {
    return key === 'lat' ? 37.5665 : 126.978;
  }
  return points.reduce((sum, point) => sum + point[key], 0) / points.length;
}

function formatDistance(distanceMeters: number | null): string | null {
  if (distanceMeters === null || Number.isNaN(distanceMeters)) {
    return null;
  }
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)}m`;
  }
  return `${(distanceMeters / 1000).toFixed(distanceMeters >= 10000 ? 0 : 1)}km`;
}

function buildKakaoMapHtml({
  appKey,
  points,
  centerLat,
  centerLng,
  accentColor,
  textColor,
}: {
  appKey: string;
  points: MapPoint[];
  centerLat: number;
  centerLng: number;
  accentColor: string;
  textColor: string;
}): string {
  const safeAppKey = encodeURIComponent(appKey);
  const safePointsJson = JSON.stringify(points).replace(/</g, '\\u003c');
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body, #map {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #edf2f4;
      }
      .marker {
        min-width: 28px;
        height: 28px;
        padding: 0 8px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid #fff;
        background: ${accentColor};
        color: ${textColor};
        font-size: 12px;
        font-weight: 900;
        line-height: 1;
        box-shadow: 0 8px 18px rgba(0,0,0,.28);
        transform: translate(-50%, -50%);
        cursor: pointer;
      }
    </style>
    <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${safeAppKey}&libraries=services"></script>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const points = ${safePointsJson};
      function post(message) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      }
      function waitForConstructors(attempt) {
        if (window.kakao && window.kakao.maps && window.kakao.maps.Map && window.kakao.maps.LatLng) {
          createMap();
          return;
        }
        if (attempt > 30) {
          post({ type: 'constructors-timeout' });
          return;
        }
        setTimeout(function () { waitForConstructors(attempt + 1); }, 100);
      }
      function createMap() {
        const center = new kakao.maps.LatLng(${centerLat}, ${centerLng});
        const map = new kakao.maps.Map(document.getElementById('map'), {
          center: center,
          level: points.length > 1 ? 5 : 4
        });
        points.forEach(function (point) {
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'marker';
          el.textContent = point.label || 'G';
          el.onclick = function () {
            map.panTo(new kakao.maps.LatLng(point.lat, point.lng));
            post({ type: 'marker-press', key: point.key });
          };
          new kakao.maps.CustomOverlay({
            map: map,
            position: new kakao.maps.LatLng(point.lat, point.lng),
            content: el,
            yAnchor: 0.5,
            xAnchor: 0.5
          });
        });
        if (points.length > 1) {
          const bounds = new kakao.maps.LatLngBounds();
          points.forEach(function (point) {
            bounds.extend(new kakao.maps.LatLng(point.lat, point.lng));
          });
          map.setBounds(bounds, 40, 40, 120, 40);
        }
        kakao.maps.event.addListener(map, 'tilesloaded', function () {
          post({ type: 'tilesloaded' });
        });
        document.addEventListener('message', handleNativeMessage);
        window.addEventListener('message', handleNativeMessage);
        function handleNativeMessage(event) {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'zoom-in') {
              map.setLevel(Math.max(1, map.getLevel() - 1));
            } else if (message.type === 'zoom-out') {
              map.setLevel(Math.min(14, map.getLevel() + 1));
            }
          } catch (error) {
            post({ type: 'native-message-error' });
          }
        }
      }
      waitForConstructors(0);
    </script>
  </body>
</html>`;
}

function makeStyles(theme: ReturnType<typeof useTokens>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.subtle,
    },
    emptyMap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.subtle,
    },
    emptyText: {
      color: theme.text2,
      fontSize: 13,
      fontWeight: '700',
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      paddingHorizontal: space[4],
      paddingTop: space[2],
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.bg,
      ...shadow.sm,
    },
    titlePill: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: space[4],
      borderRadius: radius.full,
      backgroundColor: theme.bg,
      ...shadow.sm,
    },
    title: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '900',
    },
    count: {
      color: theme.text3,
      fontSize: 11,
      fontWeight: '700',
    },
    bottomCard: {
      marginTop: 'auto',
      paddingHorizontal: space[4],
      paddingBottom: space[4],
    },
    zoomControls: {
      position: 'absolute',
      right: space[4],
      top: 112,
      width: 44,
      borderRadius: radius.full,
      overflow: 'hidden',
      backgroundColor: theme.bg,
      ...shadow.sm,
    },
    zoomButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    zoomText: {
      color: theme.text,
      fontSize: 24,
      lineHeight: 26,
      fontWeight: '900',
    },
    zoomDivider: {
      height: StyleSheet.hairlineWidth,
      marginHorizontal: space[3],
      backgroundColor: theme.hairline,
    },
    cardPressable: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      minHeight: 92,
      padding: space[4],
      borderRadius: radius.xl,
      backgroundColor: theme.bg,
      ...shadow.lg,
    },
    avatar: {
      width: 54,
      height: 54,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.accent.soft,
    },
    avatarText: {
      color: theme.text,
      fontSize: 22,
      fontWeight: '900',
    },
    cardText: {
      flex: 1,
      minWidth: 0,
    },
    gymName: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '900',
    },
    address: {
      marginTop: 3,
      color: theme.text2,
      fontSize: 13,
      fontWeight: '600',
    },
    meta: {
      marginTop: 5,
      color: theme.text3,
      fontSize: 12,
      fontWeight: '800',
    },
  });
}
