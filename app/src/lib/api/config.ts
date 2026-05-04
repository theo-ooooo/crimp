import { Platform } from 'react-native';
import Config from 'react-native-config';

/**
 * API 베이스 URL.
 *
 * (PR-A1) `react-native-config` 도입 — `.env` (또는 `ENVFILE=.env.staging` 으로 지정한
 * 다른 파일) 의 `CRIMP_API_URL` 이 빌드 타임에 주입된다. 이전엔 `process.env.X` 가 bare
 * RN 빌드 파이프라인에서 무효였어 default URL 만 동작.
 *
 * 우선순위:
 *  1. `.env` (또는 ENVFILE) 의 `CRIMP_API_URL`
 *  2. 미설정 + Android 에뮬레이터 → `http://10.0.2.2:8080` (호스트 Mac 의 localhost)
 *  3. 미설정 + iOS 시뮬레이터/그 외 → `http://localhost:8080`
 *
 * 값은 trailing slash 없이 저장.
 *
 * 멀티 환경:
 *  - 로컬 개발:  `.env` (default)
 *  - staging:   `ENVFILE=.env.staging pnpm run android` 등
 *  - 프로덕션:   `ENVFILE=.env.production pnpm run release`
 *
 * 실 디바이스에서 머신 LAN IP 가 필요하면 `.env` 의 `CRIMP_API_URL` 만 바꾸면 됨.
 * config.ts 의 default 를 직접 수정하지 말 것.
 */
const DEFAULT_API_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

function normalizeApiUrl(url: string): string {
  const trimmed = url.replace(/\/+$/, '');
  if (Platform.OS !== 'android') {
    return trimmed;
  }
  return trimmed
    .replace('://localhost', '://10.0.2.2')
    .replace('://127.0.0.1', '://10.0.2.2');
}

export const API_BASE_URL: string = normalizeApiUrl(
  Config.CRIMP_API_URL ?? DEFAULT_API_URL,
);
