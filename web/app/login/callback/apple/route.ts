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

  // 같은 도메인의 GET 페이지(`/login/callback/page.tsx`) 가 처리할 query string 으로 변환.
  const redirectUrl = new URL('/login/callback', request.url);
  if (errParam) {
    redirectUrl.searchParams.set('error', errParam);
    if (errDesc) {
      redirectUrl.searchParams.set('error_description', errDesc);
    }
  } else {
    if (code) redirectUrl.searchParams.set('code', code);
    if (state) redirectUrl.searchParams.set('state', state);
  }

  // 303 (See Other) — POST → GET 변환의 정석. 302 도 대부분 동작하지만 일부 클라이언트가
  // method 를 보존하는 케이스가 있어 303 명시.
  return NextResponse.redirect(redirectUrl, 303);
}

function stringOrNull(value: FormDataEntryValue | null): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return null;
}
