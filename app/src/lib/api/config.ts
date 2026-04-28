import { Platform } from 'react-native';

/**
 * API 베이스 URL.
 *
 * - `CRIMP_API_URL` 환경 변수에서 우선 읽는다.
 *   ※ bare RN 은 기본 빌드 파이프라인에서 `process.env.X` 가 주입되지 않아 현재
 *      이 env 는 효과가 없다. 후속에 babel-plugin-transform-inline-environment-variables
 *      또는 react-native-config 도입 시 활성화 예정.
 * - 미설정 + Android 에뮬레이터 → `http://10.0.2.2:8080` (호스트 Mac 의 localhost 로 연결).
 *   `localhost` 는 에뮬레이터 자기 자신을 가리켜 백엔드(macOS) 와 통신 불가.
 * - 미설정 + iOS 시뮬레이터/그 외 → `http://localhost:8080` (시뮬레이터는 호스트 네트워크 공유).
 * - 값은 **trailing slash 없이** 저장한다.
 *
 * 실 디바이스에서는 머신 LAN IP (예: `http://192.168.x.y:8080`) 가 필요. env 활성화 전까지는
 * 본 파일의 default 를 직접 수정하거나 후속 PR 에서 env 도입.
 */
const DEFAULT_API_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

export const API_BASE_URL: string = (
  process.env.CRIMP_API_URL ?? DEFAULT_API_URL
).replace(/\/+$/, '');
