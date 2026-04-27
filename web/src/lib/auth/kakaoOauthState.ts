/**
 * Kakao Auth.authorize 의 `state` 값을 sessionStorage 에 잠시 보관·검증하는 유틸.
 *
 * 동기:
 *  - v2 redirect flow 는 popup callback 이 없으므로 CSRF 보호를 위해 사용자가
 *    브라우저로 카카오에 갔다가 돌아올 때 우리가 발급했던 `state` 와 응답 `state`
 *    의 일치를 확인해야 한다.
 *  - localStorage 가 아닌 sessionStorage 를 쓰는 이유: 탭 단위로 격리되고, 탭이
 *    닫히면 자동 폐기되어 토큰/CSRF 잔여물이 남지 않는다.
 *
 * 사용 흐름:
 *  - `/login` 카카오 클릭 직전 → `saveState(generated)`.
 *  - `/login/callback` 도착 직후 → `consumeState()` 로 한 번 읽고 즉시 삭제,
 *    응답 `state` 와 비교.
 */

export const KAKAO_OAUTH_STATE_KEY = 'crimp.kakao.oauthState';

/** 16자 영숫자 state 생성. crypto.getRandomValues 가 가능하면 사용. */
export function generateOauthState(): string {
  const bytes = new Uint8Array(12);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let out = '';
  for (const b of bytes) {
    out += b.toString(36).padStart(2, '0');
  }
  return out.slice(0, 16);
}

export function saveOauthState(state: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(KAKAO_OAUTH_STATE_KEY, state);
  } catch {
    // sessionStorage 비활성 환경 — state 검증은 callback 에서 실패 처리.
  }
}

/**
 * 저장된 state 를 읽고 즉시 제거. 한 번만 읽혀야 하므로 항상 consume 패턴.
 *
 * 반환값이 null 이면:
 *  - sessionStorage 비활성, 또는
 *  - 저장 단계에서 실패, 또는
 *  - 이미 다른 탭에서 소비됨.
 * 호출부는 이 경우 callbackStateMismatch 로 처리한다.
 */
export function consumeOauthState(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.sessionStorage.getItem(KAKAO_OAUTH_STATE_KEY);
    window.sessionStorage.removeItem(KAKAO_OAUTH_STATE_KEY);
    return v;
  } catch {
    return null;
  }
}
