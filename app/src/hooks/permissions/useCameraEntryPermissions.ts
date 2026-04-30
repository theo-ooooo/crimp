import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  PERMISSIONS,
  RESULTS,
  checkMultiple,
  requestMultiple,
  type Permission,
  type PermissionStatus,
} from 'react-native-permissions';

/**
 * 카메라 진입 시 묶음 권한 체크/요청 훅 (PR #100, F5 PR-B).
 *
 * <p>카메라/마이크 권한은 vision-camera 의 자체 훅이 별도 관리하지만 본 훅은 인트로 모달
 * 노출 결정·일괄 요청을 위해 같은 권한을 react-native-permissions 로 통일 조회한다.
 * 위치는 vision-camera 가 다루지 않으므로 본 훅이 단독 책임.
 *
 * <p>권한 키 (Platform 별):
 * <ul>
 *   <li>카메라 — iOS: CAMERA / Android: CAMERA</li>
 *   <li>마이크 — iOS: MICROPHONE / Android: RECORD_AUDIO</li>
 *   <li>위치   — iOS: LOCATION_WHEN_IN_USE / Android: ACCESS_FINE_LOCATION</li>
 * </ul>
 *
 * <p>{@link CameraEntryPermissionState#needsIntro} 는 "아직 결정되지 않은 권한이 1개 이상" 일
 * 때 true. {@link RESULTS.DENIED}(아직 한 번도 요청 안 함) 만 인트로 트리거 — {@link RESULTS.BLOCKED}
 * (영구 거부) 는 인트로로 다시 받을 수 없으니 호출자가 fallback UI 또는 설정으로 유도.
 */

export type PermStatus = 'granted' | 'denied' | 'blocked' | 'unavailable' | 'limited';

export type CameraEntryPermissionState = {
  camera: PermStatus;
  microphone: PermStatus;
  location: PermStatus;
  /** denied(미결정) 인 항목이 1개 이상 — 인트로 모달을 띄울 신호. */
  needsIntro: boolean;
  /** 모든 권한이 granted/limited — 카메라 진입 가능. */
  allGranted: boolean;
};

export type UseCameraEntryPermissions = {
  state: CameraEntryPermissionState;
  /** 한 번도 결정 안 된 권한들을 한 번에 요청. 결과는 자동으로 state 에 반영. */
  requestAll: () => Promise<void>;
  /** 현재 OS 권한 상태 재조회 (예: 사용자가 설정 다녀온 직후). */
  refresh: () => Promise<void>;
  /** 첫 마운트 또는 refresh 호출 후 응답이 도착했는지. false 면 아직 알 수 없음. */
  ready: boolean;
};

const targetPermissions = (): Permission[] => {
  if (Platform.OS === 'ios') {
    return [
      PERMISSIONS.IOS.CAMERA,
      PERMISSIONS.IOS.MICROPHONE,
      PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
    ];
  }
  return [
    PERMISSIONS.ANDROID.CAMERA,
    PERMISSIONS.ANDROID.RECORD_AUDIO,
    PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  ];
};

const cameraKey = (): Permission =>
  Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;
const microphoneKey = (): Permission =>
  Platform.OS === 'ios' ? PERMISSIONS.IOS.MICROPHONE : PERMISSIONS.ANDROID.RECORD_AUDIO;
const locationKey = (): Permission =>
  Platform.OS === 'ios'
    ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

const toStatus = (s: PermissionStatus | undefined): PermStatus => {
  switch (s) {
    case RESULTS.GRANTED:
      return 'granted';
    case RESULTS.DENIED:
      return 'denied';
    case RESULTS.BLOCKED:
      return 'blocked';
    case RESULTS.LIMITED:
      return 'limited';
    case RESULTS.UNAVAILABLE:
    default:
      return 'unavailable';
  }
};

const buildState = (
  camera: PermStatus,
  microphone: PermStatus,
  location: PermStatus,
): CameraEntryPermissionState => {
  // denied 가 하나라도 있으면 — 한 번도 결정 안 된 항목이라 인트로로 요청 가능.
  const needsIntro = [camera, microphone, location].some((s) => s === 'denied');
  // limited 는 iOS 사진 라이브러리에서 주로 쓰지만 위치 LOCATION_WHEN_IN_USE 는 보통 granted.
  // 안전하게 limited 도 사용 가능 상태로 간주.
  const allGranted = [camera, microphone, location].every((s) => s === 'granted' || s === 'limited');
  return { camera, microphone, location, needsIntro, allGranted };
};

const initial: CameraEntryPermissionState = buildState('denied', 'denied', 'denied');

export function useCameraEntryPermissions(active: boolean): UseCameraEntryPermissions {
  const [state, setState] = useState<CameraEntryPermissionState>(initial);
  const [ready, setReady] = useState(false);
  // refresh 동시 호출 가드 — active 토글 직후 여러 번 fire 하지 않도록.
  const inflightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (inflightRef.current) {
      return;
    }
    inflightRef.current = true;
    try {
      const result = await checkMultiple(targetPermissions());
      const next = buildState(
        toStatus(result[cameraKey()]),
        toStatus(result[microphoneKey()]),
        toStatus(result[locationKey()]),
      );
      setState(next);
      setReady(true);
    } finally {
      inflightRef.current = false;
    }
  }, []);

  const requestAll = useCallback(async () => {
    // [PR #100 리뷰 I2] denied 인 항목만 요청 — 이미 granted/blocked/unavailable 은 다시 요청해도
    // 의미 없음 (특히 blocked 는 시스템 다이얼로그가 다시 뜨지 않음). race 회피 위해 호출 시점에
    // OS 권한 상태를 한 번 더 fresh-check 한 다음 필터링 — useCallback closure 가 stale 일 수 있는
    // 시나리오 (refresh 가 아직 fire 되지 않은 첫 호출 등) 대응.
    let camNow: PermStatus = state.camera;
    let micNow: PermStatus = state.microphone;
    let locNow: PermStatus = state.location;
    try {
      const fresh = await checkMultiple(targetPermissions());
      camNow = toStatus(fresh[cameraKey()]);
      micNow = toStatus(fresh[microphoneKey()]);
      locNow = toStatus(fresh[locationKey()]);
    } catch {
      // checkMultiple 실패 시 closure state 로 fallback.
    }
    const target: Permission[] = [];
    if (camNow === 'denied') {
      target.push(cameraKey());
    }
    if (micNow === 'denied') {
      target.push(microphoneKey());
    }
    if (locNow === 'denied') {
      target.push(locationKey());
    }
    if (target.length === 0) {
      // denied 가 없으면 (모두 결정됨) refresh 만 하고 종료.
      await refresh();
      return;
    }
    await requestMultiple(target);
    // 요청 후 state 동기화 — 결과가 result map 에 들어오지만 일관성을 위해 refresh 한 번 더.
    await refresh();
  }, [state.camera, state.microphone, state.location, refresh]);

  // [PR #100 리뷰 I1] active=false 가 되면 ready 와 state 를 초기화 — 시트 닫고 재진입 시
  // 이전 사이클의 stale 결과로 인트로가 한 프레임 깜빡이는 회귀 차단. 다음 active=true 에서
  // refresh 가 OS 응답 도착할 때까지 ready=false 라 showPermIntro 가 false 로 안정.
  useEffect(() => {
    if (!active) {
      setReady(false);
      setState(initial);
      return;
    }
    refresh().catch(() => undefined);
  }, [active, refresh]);

  return { state, requestAll, refresh, ready };
}
