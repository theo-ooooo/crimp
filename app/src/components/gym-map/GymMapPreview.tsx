import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop, Line, Path, Text as SvgText } from 'react-native-svg';

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
      const base: Marker[] = [
        { key: 'a', label: 'A', point: { x: 18, y: 28 }, color: '#E53935' },
        { key: 'b', label: 'B', point: { x: 38, y: 18 }, color: '#FB8C00' },
        { key: 'c', label: 'C', point: { x: 62, y: 36 }, color: '#1E88E5' },
        { key: 'd', label: 'D', point: { x: 75, y: 64 }, color: '#43A047' },
        { key: 'e', label: 'E', point: { x: 26, y: 60 }, color: '#FFFFFF' },
      ];
      if (detailGym && detailGym.lat !== null && detailGym.lng !== null) {
        base.push({
          key: 'gym',
          label: detailGym.name.slice(0, 1) || 'G',
          point: { x: 50, y: 50 },
          active: true,
          color: theme.accent.base,
        });
      }
      return base;
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

  const content = (
    <View style={[styles.frame, variant === 'detail' ? styles.detailFrame : styles.searchFrame]}>
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
  });
}
