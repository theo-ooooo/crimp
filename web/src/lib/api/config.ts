/**
 * API 베이스 URL.
 *
 * - `NEXT_PUBLIC_API_URL` 환경 변수에서 읽어 온다.
 * - 미설정 시 로컬 백엔드(`http://localhost:8080`) 기본값.
 * - 값은 **trailing slash 없이** 저장한다.
 */
export const API_BASE_URL: string = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
).replace(/\/+$/, '');
