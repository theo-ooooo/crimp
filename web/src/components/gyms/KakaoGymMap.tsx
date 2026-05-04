'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { CrimpIcon } from '@/components/primitives';

type KakaoLatLng = {
  new (lat: number, lng: number): KakaoLatLngInstance;
};

interface KakaoLatLngInstance {
  getLat(): number;
  getLng(): number;
}

interface KakaoMapInstance {
  setCenter(latLng: KakaoLatLngInstance): void;
  setLevel(level: number): void;
}

interface KakaoMarker {
  setMap(map: KakaoMapInstance | null): void;
}

interface KakaoEvent {
  addListener(target: KakaoMarker, type: 'click', handler: () => void): void;
}

interface KakaoMaps {
  load(callback: () => void): void;
  LatLng: KakaoLatLng;
  event: KakaoEvent;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLngInstance; level: number },
  ) => KakaoMapInstance;
  Marker: new (options: {
    map: KakaoMapInstance;
    position: KakaoLatLngInstance;
    title?: string;
  }) => KakaoMarker;
}

declare global {
  interface Window {
    kakao?: {
      maps?: KakaoMaps;
    };
    __crimpKakaoMapLoading?: Promise<void>;
  }
}

export interface KakaoGymMapPoint {
  id: string;
  name: string;
  lat: string | number;
  lng: string | number;
}

interface KakaoGymMapProps {
  points: KakaoGymMapPoint[];
  className?: string;
  level?: number;
  cta?: string;
  onMarkerClick?: (pointId: string) => void;
}

export function KakaoGymMap({
  points,
  className,
  level = 5,
  cta,
  onMarkerClick,
}: KakaoGymMapProps): JSX.Element {
  const containerId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<KakaoMarker[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const normalized = useMemo(() => normalizePoints(points), [points]);
  const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY;

  useEffect(() => {
    if (!apiKey || normalized.length === 0) return;
    let alive = true;
    setFailed(false);
    loadKakaoMaps(apiKey)
      .then(() => {
        if (alive) setReady(true);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [apiKey, normalized.length]);

  useEffect(() => {
    if (!ready || !containerRef.current || normalized.length === 0) return;
    const maps = window.kakao?.maps;
    if (!maps) {
      setFailed(true);
      return;
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const centerPoint = normalized[0]!;
    const center = new maps.LatLng(centerPoint.lat, centerPoint.lng);
    const map = new maps.Map(containerRef.current, { center, level });
    normalized.forEach((point) => {
      const position = new maps.LatLng(point.lat, point.lng);
      const marker = new maps.Marker({
        map,
        position,
        title: point.name,
      });
      maps.event.addListener(marker, 'click', () => onMarkerClick?.(point.id));
      markersRef.current.push(marker);
    });

    if (normalized.length === 1) {
      map.setCenter(center);
      map.setLevel(level);
    }

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, [level, normalized, onMarkerClick, ready]);

  if (!apiKey || normalized.length === 0 || failed) {
    return <MapFallback className={className} points={normalized} cta={cta} />;
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border border-hairline bg-subtle shadow-xs ${className ?? ''}`}>
      <div id={containerId} ref={containerRef} className="h-full min-h-[180px] w-full" />
      {cta ? (
        <span className="absolute bottom-4 right-4 z-10 inline-flex h-10 items-center gap-2 rounded-lg bg-bg px-4 text-caption font-extrabold text-text shadow-xs">
          {cta}
          <CrimpIcon.chevR s={16} />
        </span>
      ) : null}
    </div>
  );
}

function MapFallback({
  points,
  className,
  cta,
}: {
  points: Array<{ id: string; name: string; lat: number; lng: number }>;
  className?: string;
  cta?: string;
}): JSX.Element {
  const visible = points.slice(0, 4);
  return (
    <div className={`relative overflow-hidden rounded-xl border border-hairline bg-subtle shadow-xs ${className ?? ''}`}>
      <div className="absolute inset-0 opacity-80 [background-image:linear-gradient(var(--color-hairline)_1px,transparent_1px),linear-gradient(90deg,var(--color-hairline)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute left-[-10%] top-[48%] h-16 w-[120%] -rotate-6 border-t-4 border-text-4/30" />
      {visible.map((point, i) => (
        <span
          key={point.id}
          className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-bg shadow-sm"
          style={{
            left: `${[20, 54, 78, 38][i % 4]!}%`,
            top: `${[24, 55, 28, 63][i % 4]!}%`,
          }}
          title={point.name}
        >
          <span className="h-7 w-7 rounded-full bg-accent" />
        </span>
      ))}
      {cta ? (
        <span className="absolute bottom-4 right-4 z-10 inline-flex h-10 items-center gap-2 rounded-lg bg-bg px-4 text-caption font-extrabold text-text shadow-xs">
          {cta}
          <CrimpIcon.chevR s={16} />
        </span>
      ) : null}
    </div>
  );
}

function normalizePoints(points: KakaoGymMapPoint[]) {
  return points
    .map((point) => ({
      id: point.id,
      name: point.name,
      lat: Number(point.lat),
      lng: Number(point.lng),
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

function loadKakaoMaps(apiKey: string): Promise<void> {
  if (window.kakao?.maps) {
    return new Promise((resolve) => window.kakao?.maps?.load(resolve));
  }
  if (window.__crimpKakaoMapLoading) return window.__crimpKakaoMapLoading;

  window.__crimpKakaoMapLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(apiKey)}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = () => {
      if (!window.kakao?.maps) {
        reject(new Error('Kakao Maps SDK did not initialize'));
        return;
      }
      window.kakao.maps.load(resolve);
    };
    script.onerror = () => reject(new Error('Kakao Maps SDK failed to load'));
    document.head.appendChild(script);
  });

  return window.__crimpKakaoMapLoading;
}
