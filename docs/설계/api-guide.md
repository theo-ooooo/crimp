# API 설계 가이드

| 항목 | 내용 |
| --- | --- |
| 작성일 | 2026-04-17 |
| 작성자 | 강경원 |
| 상태 | Draft |
| 단일 소스 | `api/openapi.yaml` (OpenAPI 3.1) |

## 1. 기본 원칙

- **RESTful**, 자원 복수형 명사 (`/users`, `/gyms`, `/feed-posts`)
- JSON 요청·응답, `application/json; charset=utf-8`
- 식별자는 외부 노출용 **ULID(ext_id)** 사용, 내부 BIGINT PK 노출 금지
- 타임존: 응답은 **ISO 8601 UTC** (`2026-04-17T10:30:00Z`), 클라이언트에서 KST 변환
- 모든 엔드포인트에 OpenAPI 스펙 주석, `springdoc-openapi`로 자동 생성

## 2. URL 규칙

```
/api/v1/{resource}                    # 리스트
/api/v1/{resource}/{ext_id}           # 단건
/api/v1/{resource}/{ext_id}/{sub}     # 서브리소스
/api/v1/me/...                        # 인증 사용자 컨텍스트
```

- 버전: path prefix `/v1` (호환 불가한 변경 시 `/v2` 분기)
- 동사가 필요한 액션: `/api/v1/feed-posts/{ext_id}:like` (Google AOM 스타일, 드물게 사용)

## 3. 인증·인가

| 단계 | 방법 |
| --- | --- |
| 소셜 로그인 (id_token 직접 교환) | `POST /api/v1/auth/oauth/{provider}` (provider: `kakao`/`apple`) — 모바일/JS SDK 가 직접 받은 OIDC `id_token` 을 본문 `idToken` 으로 전달 |
| 소셜 로그인 (code 교환) | `POST /api/v1/auth/oauth/{provider}/code` — 웹 v2 redirect flow 전용. 본문 `{ code, redirectUri }`. 서버가 provider `/oauth/token` 호출 후 id_token 을 검증해 JWT 발급 |
| 토큰 재발급 | `POST /api/v1/auth/refresh` |
| 로그아웃 | `POST /api/v1/auth/logout` (refresh 블랙리스트) |
| 이후 요청 | `Authorization: Bearer {accessToken}` |

- Access: 15분, Refresh: 14일
- Refresh는 Redis에 `refresh:{userId}:{jti}` 저장, 로테이션 방식
- Kakao OAuth 키는 앱/웹/서버를 분리한다. 모바일 SDK audience 는
  `KAKAO_NATIVE_CLIENT_ID`, 웹 JavaScript SDK audience 는 `KAKAO_WEB_CLIENT_ID`,
  authorization code 교환의 token endpoint `client_id` 는 `KAKAO_REST_API_KEY` 를 쓴다.
- code 교환 엔드포인트는 provider REST API 키가 환경 변수 (`KAKAO_REST_API_KEY` 등) 로
  설정되지 않았을 때 `KAKAO_OAUTH_NOT_CONFIGURED` (HTTP 503) 으로 명시 응답한다.

## 4. 공통 응답 포맷 (응답 봉투 스펙)

모든 HTTP 응답(성공·실패)은 `ApiResponse<T>` envelope 을 따른다.
구현 참조: `api/crimp-common/src/main/java/io/crimp/common/response/ApiResponse.java`.

### 성공 (HTTP 2xx)
```json
{
  "status": true,
  "data": { /* resource */ }
}
```

### 리스트 (커서 페이지네이션, HTTP 2xx)

리스트 엔드포인트는 `data` 객체 안에 `items` 배열 + `page` 메타를 둔다. `data` 는 리소스 컬렉션 자체가 아니라 **비즈니스 payload 객체**다.

```json
{
  "status": true,
  "data": {
    "items": [ /* items */ ],
    "page": {
      "nextCursor": 123,
      "size": 20
    }
  }
}
```

### 에러 (HTTP 4xx/5xx — HTTP status 는 그대로 유지)
```json
{
  "status": false,
  "error": {
    "code": "AUTH_EXPIRED",
    "message": "Access token expired",
    "details": { "field": "token" }
  }
}
```

### 예외: 204 No Content

성공 DELETE(`/sessions/{extId}`, `/attempts/{extId}`, `/auth/logout`) 는 전통적인 REST 관례대로 **바디 없이 204** 를 반환한다. envelope 로 감싸지 않으며 클라이언트는 HTTP status 만으로 성공을 판단한다.

### 직렬화 규약 — `null` 필드 제거

`ApiResponse` 는 `@JsonInclude(NON_NULL)` 로 직렬화되므로 **`null` 필드는 응답에 포함되지 않는다**.

- 성공 시 `error` 키는 항상 누락
- 실패 시 `data` 키는 항상 누락
- **payload 가 `null` 인 성공 응답** (e.g. body 없는 success) 은 `data` 필드도 누락된다 → 클라이언트는 `{ "status": true }` 만 받을 수 있음. 호출부 zod 스키마는 `z.void()` / `z.unknown().optional()` 로 받거나, 백엔드가 `204` 를 반환하도록 설계할 것.

### 구현 메모

- 서버측: `GlobalResponseWrapper`(`ResponseBodyAdvice`) 가 모든 컨트롤러 반환값을 `ApiResponse.success(...)` 로 자동 래핑. `@ExceptionHandler` 는 `ApiResponse.failure(ErrorBody.of(...))` 를 `ResponseEntity.status(...)` 로 감싸 반환한다.
- Actuator(`/actuator/**`), Swagger UI(`/swagger-ui/**`), OpenAPI(`/v3/api-docs/**`) 는 래핑 대상에서 제외된다 — 정확히 prefix 거나 prefix + `/` 매칭만 skip (예: `/actuator-other` 는 일반 응답).
- `meta.requestId` / `meta.serverTime` 는 현재 스펙에서 제거. 추적은 `X-Request-Id` 헤더로 일원화(섹션 10 참조).

## 5. 에러 코드 체계

| HTTP | 에러 code 예시 | 의미 |
| --- | --- | --- |
| 400 | `VALIDATION_FAILED` / `INVALID_MAIN_GYM_REQUEST` | 요청 값 검증 실패 |
| 401 | `AUTH_REQUIRED` / `AUTH_EXPIRED` / `AUTH_INVALID` | 인증 실패 |
| 403 | `FORBIDDEN_RESOURCE` | 권한 없음 |
| 404 | `RESOURCE_NOT_FOUND` / `MAIN_GYM_NOT_FOUND` | 자원 없음 |
| 409 | `RESOURCE_CONFLICT` / `NICKNAME_TAKEN` | 충돌 |
| 413 | `PAYLOAD_TOO_LARGE` | 파일 크기 초과 |
| 422 | `UNPROCESSABLE_ENTITY` | 비즈니스 규칙 위반 |
| 429 | `RATE_LIMITED` | 레이트 리밋 |
| 500 | `INTERNAL_ERROR` | 내부 오류 |
| 503 | `DEPENDENCY_UNAVAILABLE` / `KAKAO_OAUTH_NOT_CONFIGURED` | 외부 의존성 장애 / provider OAuth 키 미설정 |

- 에러 `code`는 `UPPER_SNAKE_CASE` 고정 enum, 문서화된 집합만 사용
- 유저에게 직접 보여줘도 되는 문구는 `message`, 기술적 디버깅은 `details`

## 6. 페이지네이션

- **커서 방식 기본**: `?cursor=01HY...&size=20` (size는 10·20·50, 기본 20, 최대 50)
- 관리자 목록 등 전체 집계가 필요한 경우에만 offset 허용 (`?page=1&size=20`)
- 커서는 서버에서 인코딩된 불투명 문자열 (ULID · 복합정렬 키)

## 7. 정렬·필터

- 정렬: `?sort=createdAt:desc,likeCount:desc` (쉼표 구분, 화이트리스트)
- 필터: 쿼리 파라미터. 배열은 반복 키 `?grade=V3&grade=V4`
- 검색: `?q=` (Phase 1은 LIKE, Phase 2 OpenSearch)

## 8. 멱등성·안전성

- 모든 `POST`에 `Idempotency-Key` 헤더 지원 (24h TTL Redis 저장)
- `PUT`/`DELETE`는 자연스럽게 멱등
- 결제·알림 등 중복 방지가 중요한 엔드포인트는 Idempotency-Key 필수

## 9. 레이트 리밋

| 대상 | 한도 | 응답 |
| --- | --- | --- |
| 미인증 IP | 분당 60회 | 429 + `Retry-After` |
| 인증 사용자 | 분당 180회 | 429 |
| 로그인 실패 IP | 15분 10회 | 차단 (`AUTH_BLOCKED`) |
| 영상 업로드 | 10분 20회 | 429 |

- 응답 헤더: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## 10. 추적·로깅

- 요청 헤더 `X-Request-Id`가 있으면 그대로 사용, 없으면 서버 생성 (ULID)
- 모든 응답에 `X-Request-Id` 반환
- OpenTelemetry traceparent 전파

## 11. MVP 엔드포인트 인벤토리

### 인증 (`/api/v1/auth`)
| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/v1/auth/oauth/{provider}` | 소셜 로그인 교환 (모바일/JS SDK id_token) |
| POST | `/api/v1/auth/oauth/{provider}/code` | 웹 v2 redirect flow — authorization code 교환 (서버 → provider /oauth/token) |
| POST | `/api/v1/auth/refresh` | 토큰 재발급 |
| POST | `/api/v1/auth/logout` | 로그아웃 |

### 사용자 (`/api/v1/me`, `/api/v1/users`)
| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/me` | 내 정보. 응답에 `nicknameConfigured`(사용자가 닉네임을 직접 저장했는지), `mainGymId`(numeric, 호환), `mainGym: { extId, name, brand }`(해석된 lightweight 객체, 미설정 시 null/누락), `avatarMediaId`, `avatarUrl` 을 함께 반환. `avatarUrl` 은 CDN 설정이 있고 연결된 미디어가 READY IMAGE 일 때만 내려간다. |
| PATCH | `/api/v1/me/profile` | 프로필 수정. 주 암장은 `mainGymExtId: String` (권장) / `mainGymId: number` (호환) / `clearMainGym: true` (명시 해제) 중 하나로 표현. 두 변경 입력을 동시에 set 하면 400 (`INVALID_MAIN_GYM_REQUEST`), `mainGymExtId` 가 존재하지 않는 ULID 면 404 (`MAIN_GYM_NOT_FOUND`). 프로필 이미지는 `avatarMediaId` 또는 `clearAvatar: true` 로 연결/해제한다. `avatarMediaId` 는 본인 소유 READY IMAGE 만 허용하며, 위반 시 `AVATAR_MEDIA_*` 에러를 반환한다. |
| POST | `/api/v1/me/profile/avatar` | Phase 1.5 후보. 프로필 이미지 업로드 편의 endpoint. 기본안은 기존 `/media/presign` → PUT → `/media/complete` 후 `PATCH /me/profile { avatarMediaId }` 재사용이며, UX 단순화를 위해 래핑 endpoint 도 검토한다. |
| DELETE | `/api/v1/me` | 계정 탈퇴. 204 응답. refresh token 전체 폐기, `users.status=DELETED` soft delete, 이후 내 정보/공개 프로필 조회·수정 및 OAuth 재로그인/refresh 재발급을 차단한다. 기존 공개 컨텐츠는 유지하되 작성자 식별 정보는 익명화한다. |
| GET | `/api/v1/users/{extId}` | 타 사용자 프로필 |
| POST | `/api/v1/users/{extId}:follow` | 팔로우 |
| DELETE | `/api/v1/users/{extId}:follow` | 언팔로우 |

### 암장·루트 (`/api/v1/gyms`, `/api/v1/routes`)
| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/gyms` | 암장 검색 (`q`, `brand`, `lat`, `lng`, `cursor`, `size`). `lat`/`lng` 둘 다 있으면 거리순 정렬 + `distanceMeters` 포함 |
| GET | `/api/v1/gyms/{extId}` | 암장 상세 |
| GET | `/api/v1/gyms/{extId}/routes` | 루트 목록 (활성, 인증 필요, 커서 페이지네이션 `?cursor=&size=`, id DESC) |
| GET | `/api/v1/gyms/{extId}/recent-activity` | 암장 최근 활동. 탈퇴 사용자 활동은 `userExtId=null`, `nickname=탈퇴사용자`, `avatarColorHue=0` 으로 익명화한다. |
| GET | `/api/v1/routes/{extId}` | 루트 상세 |

### 등반 기록 (`/api/v1/sessions`, `/api/v1/attempts`)
| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/me/sessions` | 내 세션 목록 |
| POST | `/api/v1/sessions` | 세션 생성 |
| GET | `/api/v1/sessions/{extId}` | 세션 상세 (시도 포함) |
| PATCH | `/api/v1/sessions/{extId}` | 세션 수정 |
| DELETE | `/api/v1/sessions/{extId}` | 세션 삭제 |
| POST | `/api/v1/sessions/{extId}/attempts` | 시도 추가 |
| PATCH | `/api/v1/attempts/{extId}` | 시도 수정 |
| DELETE | `/api/v1/attempts/{extId}` | 시도 삭제 |
| GET | `/api/v1/me/stats` | 홈 대시보드 집계 (주간 + 라이프타임) — **주 경계는 KST 기준** |
| GET | `/api/v1/me/stats/monthly` | 월별 통계 (예정) |

### 피드 (`/api/v1/feed`, `/api/v1/feed-posts`, `/api/v1/comments`)
| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/feed?filter=popular\|my-gym\|friends&cursor=&size=` | 피드 (popular 기본 / my-gym = Profile.mainGymId / friends = Follow 기반). items.extId 는 **feed_post.ext_id** (V908 후 의미 전환), liked / likes / comments 실데이터. 탈퇴 사용자 게시글은 유지하되 작성자 `userExtId=null`, `userNickname=탈퇴사용자`, `avatarColorHue=0`, `avatarUrl=null` 로 익명화한다. |
| POST | `/api/v1/feed-posts/{extId}/like` | 좋아요 추가 (멱등) → `{ liked: true, likeCount: N }` |
| DELETE | `/api/v1/feed-posts/{extId}/like` | 좋아요 취소 (멱등) → `{ liked: false, likeCount: N }` |
| GET | `/api/v1/feed-posts/{extId}/comments?cursor=&size=` | 댓글 목록 (Comment.id ASC, forward 페이지네이션) |
| POST | `/api/v1/feed-posts/{extId}/comments` | 댓글 작성 — `{ content: 1..1000, parentExtId? }` |
| DELETE | `/api/v1/comments/{extId}` | 댓글 삭제 (본인만, soft delete, 204) |
| GET | `/api/v1/feed-posts` | 전체·필터 피드 (예정) |
| POST | `/api/v1/feed-posts` | 피드 작성 (예정 — 자유 글) |
| GET | `/api/v1/feed-posts/{extId}` | 게시물 상세 (예정) |
| PATCH | `/api/v1/feed-posts/{extId}` | 게시물 수정 (예정) |
| DELETE | `/api/v1/feed-posts/{extId}` | 게시물 삭제 (예정) |

> **자동 게시 정책**: `POST /sessions/{extId}/attempts` 에서 `result ∈ {SEND, FLASH, ONSIGHT}`
> 인 시도가 기록되면 동일 트랜잭션에서 `feed_posts` 행이 자동 생성된다 (`visibility=PUBLIC`,
> `attempt_id` UNIQUE 1:1, V908). `FAIL`/`TRY` 는 게시되지 않는다.

> **탈퇴 사용자 표시 정책**: 공개 피드/댓글/암장 최근 활동은 기록 자체를 유지한다. 작성자가 탈퇴한 경우
> `userExtId` 는 `null` 또는 `@JsonInclude(NON_NULL)` 에 의해 누락될 수 있고, 닉네임은
> `탈퇴사용자`, `avatarColorHue=0`, 프로필 이미지 URL 은 `null/누락` 으로 응답한다. 앱/웹 스키마는
> 작성자 extId nullable 을 허용해야 한다.

### 미디어 (`/api/v1/media`)
| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/v1/media/presign` | UPLOADING 행 생성 + S3 presigned PUT URL. Body: `{ kind, usage?, mime, byteSize }`. `usage` 는 `ATTEMPT`(기본), `AVATAR`, `POSTER` 중 하나이며 프로필 이미지는 `AVATAR` 로 업로드한 READY IMAGE 만 연결 가능. |
| POST | `/api/v1/media/{id}/complete` | S3 PUT 성공 후 호출 → READY. Body: `{ byteSize, width, height, durationMs, attachAsPosterForVideoId? }`. `attachAsPosterForVideoId` 는 **IMAGE** 완료 시에만 의미 있음: 해당 id 의 **VIDEO** 미디어(이미 READY, 동일 소유자)에 본 이미지를 대표 썸네일(`media_video_thumbnails`)로 연결. 생략·null 시 기존과 동일. |

클라이언트 흐름: `presign` → `PUT` presigned URL → `complete`. 동영상 사용자 지정 포스터는 **비디오 `complete` 후** 포스터 이미지를 presign→PUT→`complete` 하며 `attachAsPosterForVideoId` 에 비디오 미디어 numeric `id` 를 넣는다.

## 12. 오픈 이슈

- [ ] 피드 랭킹 알고리즘: `/api/v1/feed` 내부에 구현 vs 별도 서비스
- [ ] 신고·차단 API 추가 시점
- [ ] GraphQL 검토 (Phase 2, 모바일 오버페칭 이슈 측정 후)
- [ ] 웹훅(파트너사 암장 정보 연동) Phase 2
