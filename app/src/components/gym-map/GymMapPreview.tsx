import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Config from 'react-native-config';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop, Line, Path, Text as SvgText } from 'react-native-svg';
import WebView from 'react-native-webview';

import { CrimpIcon } from '@/components/common/primitives';
import { radius, space, withAlpha, type Theme } from '@/lib/tokens';
import type { GymItem, GymDetail } from '@/lib/schemas/gym';

type Point = {
  x: number;
  y: number;
};

type Marker = {
  key: string;
  label: string;
  point: Point;
  active?: boolean;
  color?: string;
};

type MapPoint = {
  key: string;
  label: string;
  lat: number;
  lng: number;
  active?: boolean;
};

type Props = {
  theme: Theme;
  variant: 'search' | 'detail';
  gyms?: GymItem[];
  detailGym?: GymDetail | null;
  onPress?: () => void;
  actionLabel?: string;
};

export function GymMapPreview({
  theme,
  variant,
  gyms = [],
  detailGym = null,
  onPress,
  actionLabel = '지도 보기',
}: Props): JSX.Element {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const markers = useMemo(() => {
    if (variant === 'detail') {
      if (!detailGym || detailGym.lat === null || detailGym.lng === null) {
        return [];
      }
      return [
        {
          key: 'gym',
          label: detailGym.name.slice(0, 1) || 'G',
          point: { x: 50, y: 50 },
          active: true,
          color: theme.accent.base,
        },
      ];
    }

    const visibleGyms = gyms.filter((gym) => gym.lat !== null && gym.lng !== null).slice(0, 5);
    if (visibleGyms.length === 0) {
      return [
        { key: 'a', label: '서', point: { x: 22, y: 22 }, color: theme.accent.base, active: true },
        { key: 'b', label: '더', point: { x: 72, y: 28 }, color: theme.accent.base, active: true },
        { key: 'c', label: '볼', point: { x: 58, y: 60 }, color: theme.accent.base, active: true },
      ];
    }

    const lats = visibleGyms.map((gym) => gym.lat as number);
    const lngs = visibleGyms.map((gym) => gym.lng as number);
    const latMin = Math.min(...lats);
    const latMax = Math.max(...lats);
    const lngMin = Math.min(...lngs);
    const lngMax = Math.max(...lngs);
    const latSpan = Math.max(latMax - latMin, 0.002);
    const lngSpan = Math.max(lngMax - lngMin, 0.002);

    return visibleGyms.map((gym, index) => {
      const x = 14 + ((gym.lng! - lngMin) / lngSpan) * 72;
      const y = 18 + (1 - (gym.lat! - latMin) / latSpan) * 54;
      return {
        key: gym.extId,
        label: gym.name.slice(0, 1),
        point: { x: clamp(x, 12, 86), y: clamp(y, 16, 82) },
        active: index === 0,
        color: index === 0 ? theme.accent.base : withAlpha(theme.text, 0.82),
      };
    });
  }, [detailGym, gyms, theme.accent.base, theme.text, variant]);
  const mapPoints = useMemo<MapPoint[]>(() => {
    if (variant === 'detail') {
      if (!detailGym || detailGym.lat === null || detailGym.lng === null) {
        return [];
      }
      return [{
        key: detailGym.extId,
        label: detailGym.name.slice(0, 1) || 'G',
        lat: detailGym.lat,
        lng: detailGym.lng,
        active: true,
      }];
    }

    return gyms
      .filter((gym) => gym.lat !== null && gym.lng !== null)
      .slice(0, 5)
      .map((gym, index) => ({
        key: gym.extId,
        label: gym.name.slice(0, 1),
        lat: gym.lat as number,
        lng: gym.lng as number,
        active: index === 0,
      }));
  }, [detailGym, gyms, variant]);
  const kakaoMapKey = Config.KAKAO_MAP_JS_KEY ?? '';
  const kakaoMapBaseUrl = normalizeKakaoMapBaseUrl(Config.KAKAO_MAP_BASE_URL);
  const shouldRenderKakaoMap = kakaoMapKey.length > 0 && (variant === 'search' || mapPoints.length > 0);

  const kakaoMapContent =
    shouldRenderKakaoMap ? (
      <View style={[styles.frame, variant === 'detail' ? styles.detailFrame : styles.searchFrame]}>
        <WebView
          style={StyleSheet.absoluteFill}
          source={{
            html: buildKakaoMapHtml({
              appKey: kakaoMapKey,
              points: mapPoints,
              centerLat: averageCoordinate(mapPoints, 'lat'),
              centerLng: averageCoordinate(mapPoints, 'lng'),
              level: variant === 'detail' ? 4 : 6,
              accentColor: theme.accent.base,
              textColor: theme.text,
            }),
            baseUrl: kakaoMapBaseUrl,
          }}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['https://localhost:*']}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        />
        {mapPoints.length > 0 ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {markers.map((marker) => (
              <View
                key={marker.key}
                style={[
                  styles.nativeMarker,
                  {
                    left: `${marker.point.x}%`,
                    top: `${marker.point.y}%`,
                    backgroundColor: marker.color ?? theme.accent.base,
                    borderColor: marker.active ? theme.bg : withAlpha(theme.bg, 0.82),
                    transform: [{ translateX: -13 }, { translateY: -13 }],
                  },
                ]}
              >
                <Text style={[styles.nativeMarkerText, { color: marker.active ? theme.text : theme.bg }]}>
                  {marker.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {variant === 'search' ? (
          <View style={styles.searchFooter}>
            <View style={styles.actionButton}>
              <Text style={styles.actionButtonText}>{actionLabel}</Text>
              <CrimpIcon.chevR size={16} color={theme.text} />
            </View>
          </View>
        ) : null}
      </View>
    ) : null;

  const content = (
    kakaoMapContent ?? <View style={[styles.frame, variant === 'detail' ? styles.detailFrame : styles.searchFrame]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        {variant === 'detail' ? <DetailBackground theme={theme} /> : <SearchBackground theme={theme} />}
        {markers.map((marker) => (
          <MapMarker key={marker.key} marker={marker} />
        ))}
        {variant === 'detail' ? <DetailOverlayRings /> : null}
      </Svg>

      {variant === 'search' ? (
        <View style={styles.searchFooter}>
          <View style={styles.actionButton}>
            <Text style={styles.actionButtonText}>{actionLabel}</Text>
            <CrimpIcon.chevR size={16} color={theme.text} />
          </View>
        </View>
      ) : null}
    </View>
  );

  if (onPress && variant === 'search') {
    return (
      <Pressable onPress={onPress} style={styles.pressable} accessibilityRole="button">
        {content}
      </Pressable>
    );
  }

  return content;
}

function SearchBackground({ theme }: { theme: Theme }): JSX.Element {
  return (
    <>
      <Defs>
        <LinearGradient id="searchBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={theme.subtle} />
          <Stop offset="100%" stopColor={withAlpha(theme.subtle2, 0.85)} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill="url(#searchBg)" />
      <RoadPath d="M-4,63 C18,53 28,47 46,50 C66,54 79,65 104,56" stroke={withAlpha(theme.text4, 0.38)} />
      <RoadPath d="M0,74 C18,70 28,68 44,72 C60,76 77,82 100,72" stroke={withAlpha(theme.text4, 0.18)} />
      <GridLines theme={theme} />
    </>
  );
}

function DetailBackground({ theme }: { theme: Theme }): JSX.Element {
  return (
    <>
      <Defs>
        <LinearGradient id="detailBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#C5F03D" />
          <Stop offset="100%" stopColor="#8DB433" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill="url(#detailBg)" />
      <DetailBlobs theme={theme} />
    </>
  );
}

function MapMarker({ marker }: { marker: Marker }): JSX.Element {
  const fill = marker.color ?? '#C9F84B';
  const radius = marker.active ? 5.4 : 4.4;
  return (
    <>
      <Circle cx={marker.point.x} cy={marker.point.y} r={radius + 1.8} fill={withAlpha('#FFFFFF', 0.9)} />
      <Circle cx={marker.point.x} cy={marker.point.y} r={radius} fill={fill} />
      <TextMarker x={marker.point.x} y={marker.point.y + 0.6} label={marker.label} color={marker.active ? '#0F1419' : '#FFFFFF'} />
    </>
  );
}

function TextMarker({ x, y, label, color }: { x: number; y: number; label: string; color: string }): JSX.Element {
  return (
    <SvgTextish x={x} y={y} label={label} color={color} />
  );
}

function SvgTextish({ x, y, label, color }: { x: number; y: number; label: string; color: string }): JSX.Element {
  return (
    <SvgText x={x} y={y + 0.9} textAnchor="middle" fill={color} fontSize="4.5" fontWeight="700">
      {label}
    </SvgText>
  );
}

function DetailOverlayRings(): JSX.Element {
  return (
    <>
      <Circle cx={10} cy={76} r={14} fill="rgba(255,255,255,0.12)" />
      <Circle cx={86} cy={22} r={22} fill="rgba(255,255,255,0.10)" />
    </>
  );
}

function GridLines({ theme }: { theme: Theme }): JSX.Element {
  const lines = [];
  for (let i = 10; i < 100; i += 10) {
    lines.push(<Line key={`v-${i}`} x1={i} y1={0} x2={i} y2={100} stroke={withAlpha(theme.text4, 0.07)} strokeWidth={0.4} />);
    lines.push(<Line key={`h-${i}`} x1={0} y1={i} x2={100} y2={i} stroke={withAlpha(theme.text4, 0.07)} strokeWidth={0.4} />);
  }
  return <>{lines}</>;
}

function RoadPath({ d, stroke }: { d: string; stroke: string }): JSX.Element {
  return <Path d={d} fill="none" stroke={stroke} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" />;
}

function DetailBlobs({ theme }: { theme: Theme }): JSX.Element {
  return (
    <>
      <Circle cx={20} cy={74} r={18} fill={withAlpha('#FFFFFF', 0.08)} />
      <Circle cx={80} cy={24} r={22} fill={withAlpha('#FFFFFF', 0.08)} />
      <Circle cx={48} cy={52} r={9} fill={withAlpha(theme.bg, 0.16)} />
    </>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function averageCoordinate(points: MapPoint[], key: 'lat' | 'lng'): number {
  if (points.length === 0) {
    return key === 'lat' ? 37.5665 : 126.978;
  }
  return points.reduce((sum, point) => sum + point[key], 0) / points.length;
}

function normalizeKakaoMapBaseUrl(value?: string): string {
  const baseUrl = value && value.length > 0 ? value : 'https://localhost:8081';
  return baseUrl.replace(/^http:\/\//, 'https://');
}

function buildKakaoMapHtml({
  appKey,
  points,
  centerLat,
  centerLng,
  level,
  accentColor,
  textColor,
}: {
  appKey: string;
  points: MapPoint[];
  centerLat: number;
  centerLng: number;
  level: number;
  accentColor: string;
  textColor: string;
}): string {
  const safePointsJson = JSON.stringify(points).replace(/</g, '\\u003c');
  const safeAppKey = encodeURIComponent(appKey);
  const safeBaseUrl = JSON.stringify(Config.KAKAO_MAP_BASE_URL ?? 'http://localhost:8081');
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <base href=${safeBaseUrl} />
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
        width: 24px;
        height: 24px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid #fff;
        background: ${accentColor};
        color: ${textColor};
        font-size: 11px;
        font-weight: 800;
        line-height: 1;
        box-shadow: 0 6px 16px rgba(0,0,0,.24);
        transform: translate(-50%, -50%);
      }
      .marker.secondary {
        background: rgba(15,20,25,.82);
        color: #fff;
      }
    </style>
    <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${safeAppKey}&libraries=services"></script>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const points = ${safePointsJson};
      let didCreateMap = false;

      function initMap() {
        if (!window.kakao || !window.kakao.maps) {
          return;
        }

        waitForConstructors(0);
      }

      function waitForConstructors(attempt) {
        if (typeof window.kakao.maps.Map === 'function' && typeof window.kakao.maps.LatLng === 'function') {
          createMap();
          return;
        }
        if (attempt >= 20) {
          return;
        }
        setTimeout(function () {
          waitForConstructors(attempt + 1);
        }, 100);
      }

      function createMap() {
        if (didCreateMap) {
          return;
        }
        didCreateMap = true;

        try {
          const center = new kakao.maps.LatLng(${centerLat}, ${centerLng});
          const map = new kakao.maps.Map(document.getElementById('map'), {
            center: center,
            level: ${level},
            draggable: false,
            scrollwheel: false,
            disableDoubleClick: true,
            disableDoubleClickZoom: true
          });

          points.forEach(function (point, index) {
            const el = document.createElement('div');
            el.className = 'marker' + (point.active || index === 0 ? '' : ' secondary');
            el.textContent = point.label || 'G';
            new kakao.maps.CustomOverlay({
              map,
              position: new kakao.maps.LatLng(point.lat, point.lng),
              content: el,
              yAnchor: 0.5,
              xAnchor: 0.5
            });
          });

          function relayout() {
            map.relayout();
            map.setCenter(center);
          }

          window.addEventListener('resize', relayout);
          requestAnimationFrame(relayout);
          setTimeout(relayout, 80);
          setTimeout(relayout, 300);
          setTimeout(relayout, 1000);
        } catch (error) {
          didCreateMap = false;
        }
      }

      initMap();
    </script>
  </body>
</html>`;
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    pressable: {
      borderRadius: radius.xl,
      overflow: 'hidden',
    },
    frame: {
      borderRadius: radius.xl,
      overflow: 'hidden',
      backgroundColor: theme.subtle,
    },
    searchFrame: {
      aspectRatio: 1.9,
    },
    detailFrame: {
      minHeight: 280,
    },
    searchFooter: {
      position: 'absolute',
      right: space[4],
      bottom: space[4],
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[1],
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      borderRadius: radius.full,
      backgroundColor: withAlpha(theme.bg, 0.92),
    },
    actionButtonText: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '700',
    },
    nativeMarker: {
      position: 'absolute',
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 3,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000000',
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    nativeMarkerText: {
      fontSize: 10,
      fontWeight: '800',
    },
  });
}
