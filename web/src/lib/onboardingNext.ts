/**
 * MainGym 온보딩 게이트가 dismiss/set 이후 돌아갈 redirect 대상 경로를 안전하게
 * 추출하는 유틸. 별도 파일로 둔 이유는 page 컴포넌트와 분리해서 단위 테스트로
 * Open redirect 방어 회귀를 잡기 위함.
 *
 * 정책:
 *  - `null`/빈 문자열 → 폴백 (`/`)
 *  - `/` 로 시작하지 않으면 폴백 (`http://...`, `javascript:`, `data:`, 상대 경로 등)
 *  - `//` (protocol-relative URL) 차단
 *  - 백슬래시 포함 경로 차단 (`/\\evil.com` — 일부 브라우저가 `//` 로 정규화)
 *  - 자기 자신(`/onboarding/main-gym`) 으로 redirect 하는 self-loop 차단
 */

const SAFE_FALLBACK = '/';
const SELF_PATH = '/onboarding/main-gym';

export function resolveNext(raw: string | null | undefined): string {
  if (!raw) return SAFE_FALLBACK;
  if (!raw.startsWith('/')) return SAFE_FALLBACK;
  if (raw.startsWith('//')) return SAFE_FALLBACK;
  if (raw.includes('\\')) return SAFE_FALLBACK;
  if (
    raw === SELF_PATH ||
    raw.startsWith(`${SELF_PATH}?`) ||
    raw.startsWith(`${SELF_PATH}/`)
  ) {
    return SAFE_FALLBACK;
  }
  return raw;
}
