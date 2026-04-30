import { NextResponse, type NextRequest } from 'next/server';

/**
 * `/login/callback/apple` — Apple form_post 전용 서버 라우트 핸들러 (PR #106).
 *
 * Apple Sign In 의 scope 에 `name` 또는 `email` 이 포함되면 Apple 은 callback 을
 * `response_mode=form_post` 로 강제 — query string 이 아닌 body 의 form-encoded
 * POST 로 code/state 를 보낸다. 이를 client-side 에서 직접 처리하기 어려우므로
 * 본 라우트가 form 본문을 읽어 같은 도메인의 query-mode 페이지(`/login/callback`)
 * 로 303 redirect 한다 — 이후는 기존 client 흐름 그대로 (state 검증 + code 교환).
 *
 * <p>Next.js App Router 의 제약: 같은 segment 에 route.ts 와 page.tsx 가 공존할 수 없어
 * `/login/callback` 의 GET page 와 분리하기 위해 `/apple` 하위 segment 사용.
 *
 * <p>Apple Service ID 의 Return URL 등록 시 이 경로 (`https://&lt;도메인&gt;/login/callback/apple`)
 * 를 사용해야 한다.
 *
 * <p>Apple 이 처음 한 번만 보내는 `user` JSON (이름·성) 은 본 redirect 에서 손실
 * (id_token 에는 sub + email 만). 추후 이름 캡처가 필요하면 본 핸들러가 임시 저장 후
 * 다음 단계에 전달하는 방식 검토.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();
  const code = stringOrNull(form.get('code'));
  const state = stringOrNull(form.get('state'));
  const errParam = stringOrNull(form.get('error'));
  const errDesc = stringOrNull(form.get('error_description'));

  const params = new URLSearchParams();
  if (errParam) {
    params.set('error', errParam);
    if (errDesc) {
      params.set('error_description', errDesc);
    }
  } else {
    if (code) params.set('code', code);
    if (state) params.set('state', state);
  }

  // [PR #106 fix] **상대경로 Location** 으로 응답 — `new URL('/login/callback', request.url)` 은
  // Next.js 가 ngrok / proxy 뒤에서 받는 internal `request.url` (localhost) 로 base 를 잡아
  // 외부 브라우저가 localhost 로 가버리는 회귀 발생. 상대경로 Location 은 브라우저가 현재
  // request URL (= ngrok 도메인) 기준으로 해석해 정상 도메인 유지.
  // 303 (See Other) — POST → GET method 전환의 정석.
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: `/login/callback?${params.toString()}`,
    },
  });
}

function stringOrNull(value: FormDataEntryValue | null): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return null;
}
