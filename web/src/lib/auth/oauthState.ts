/**
 * OAuth redirect flow 의 {state, provider} 값을 sessionStorage 에 잠시 보관·검증하는 유틸.
 *
 * <p>v2 redirect flow 는 popup callback 이 없으므로 CSRF 보호를 위해 사용자가 브라우저로
 * provider 사이트에 갔다가 돌아올 때 우리가 발급했던 `state` 와 응답 `state` 의 일치를
 * 확인한다. 또한 callback 페이지 한 곳이 여러 provider (kakao/apple) 를 처리하므로
 * 어떤 provider 였는지 함께 저장.
 *
 * <p>sessionStorage 사용 이유: 탭 단위 격리, 탭 닫힘 시 자동 폐기.
 *
 * <p>(PR #106, PR-W2 — 기존 `kakaoOauthState.ts` 의 일반화 버전)
 */

export const OAUTH_STATE_KEY = 'crimp.oauth.state';

export type OauthStateProvider = 'kakao' | 'apple';

export interface OauthState {
  provider: OauthStateProvider;
  state: string;
  /** 일부 provider (Apple) 가 nonce 도 요구. 미사용 provider 는 빈 문자열. */
  nonce?: string;
  /**
   * authorize 단계에서 provider 에 전달한 redirect_uri 그대로 — code 교환 시점에 같은
   * URI 를 백엔드로 전달해 Apple/Kakao 의 redirect_uri mismatch (400) 회귀 차단.
   * (Apple form_post 라우트는 `/api/auth/apple/callback`, Kakao 는 `/login/callback`
   *  으로 서로 다름.)
   */
  redirectUri?: string;
}

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

export function saveOauthState(value: OauthState): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(OAUTH_STATE_KEY, JSON.stringify(value));
  } catch {
    // sessionStorage 비활성 환경 — state 검증은 callback 에서 실패 처리.
  }
}

/**
 * 저장된 OauthState 를 읽고 즉시 제거. 한 번만 읽혀야 하므로 consume 패턴.
 *
 * 반환값이 null 이면:
 *  - sessionStorage 비활성 / 저장 실패 / 이미 다른 탭에서 소비 / JSON 파싱 실패
 * 호출부는 이 경우 callbackStateMismatch 로 처리한다.
 */
export function consumeOauthState(): OauthState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(OAUTH_STATE_KEY);
    window.sessionStorage.removeItem(OAUTH_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OauthState;
    if (
      typeof parsed?.state === 'string' &&
      (parsed.provider === 'kakao' || parsed.provider === 'apple')
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
