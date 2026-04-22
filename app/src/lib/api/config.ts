/**
 * API 베이스 URL.
 *
 * - `EXPO_PUBLIC_API_URL` 환경 변수에서 우선 읽는다 (Expo 호환 네이밍).
 * - 미설정 시 로컬 백엔드(`http://localhost:8080`) 기본값.
 * - 값은 **trailing slash 없이** 저장한다.
 *
 * React Native 실 디바이스에서는 `localhost` 대신 머신 LAN IP 를 설정해야 한다.
 */
export const API_BASE_URL: string = (
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080'
).replace(/\/+$/, '');
