import { Platform } from 'react-native';

/**
 * API 베이스 URL.
 *
 * - `EXPO_PUBLIC_API_URL` 환경 변수에서 우선 읽는다 (Expo 호환 네이밍, 명시 설정 우선).
 * - 미설정 + Android 에뮬레이터 → `http://10.0.2.2:8080` (호스트 Mac 의 localhost 로 연결).
 *   `localhost` 는 에뮬레이터 자기 자신을 가리켜 백엔드(macOS) 와 통신 불가.
 * - 미설정 + iOS 시뮬레이터/그 외 → `http://localhost:8080` (시뮬레이터는 호스트 네트워크 공유).
 * - 값은 **trailing slash 없이** 저장한다.
 *
 * 실 디바이스에서는 `EXPO_PUBLIC_API_URL` 에 머신 LAN IP (예: `http://192.168.x.y:8080`) 를 직접 설정.
 */
const DEFAULT_API_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

export const API_BASE_URL: string = (
  process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL
).replace(/\/+$/, '');
