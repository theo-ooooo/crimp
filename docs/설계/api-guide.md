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
| 소셜 로그인 | `POST /api/v1/auth/oauth/{provider}` (provider: `kakao`/`apple`/`google`) |
| 토큰 재발급 | `POST /api/v1/auth/refresh` |
| 로그아웃 | `POST /api/v1/auth/logout` (refresh 블랙리스트) |
| 이후 요청 | `Authorization: Bearer {accessToken}` |

- Access: 15분, Refresh: 14일
- Refresh는 Redis에 `refresh:{userId}:{jti}` 저장, 로테이션 방식

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
| 400 | `VALIDATION_FAILED` | 요청 값 검증 실패 |
| 401 | `AUTH_REQUIRED` / `AUTH_EXPIRED` / `AUTH_INVALID` | 인증 실패 |
| 403 | `FORBIDDEN_RESOURCE` | 권한 없음 |
| 404 | `RESOURCE_NOT_FOUND` | 자원 없음 |
| 409 | `RESOURCE_CONFLICT` / `NICKNAME_TAKEN` | 충돌 |
| 413 | `PAYLOAD_TOO_LARGE` | 파일 크기 초과 |
| 422 | `UNPROCESSABLE_ENTITY` | 비즈니스 규칙 위반 |
| 429 | `RATE_LIMITED` | 레이트 리밋 |
| 500 | `INTERNAL_ERROR` | 내부 오류 |
| 503 | `DEPENDENCY_UNAVAILABLE` | 외부 의존성 장애 |

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
| POST | `/api/v1/auth/oauth/{provider}` | 소셜 로그인 교환 |
| POST | `/api/v1/auth/refresh` | 토큰 재발급 |
| POST | `/api/v1/auth/logout` | 로그아웃 |

### 사용자 (`/api/v1/me`, `/api/v1/users`)
| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/me` | 내 정보 |
| PATCH | `/api/v1/me/profile` | 프로필 수정 |
| GET | `/api/v1/users/{extId}` | 타 사용자 프로필 |
| POST | `/api/v1/users/{extId}:follow` | 팔로우 |
| DELETE | `/api/v1/users/{extId}:follow` | 언팔로우 |

### 암장·루트 (`/api/v1/gyms`, `/api/v1/routes`)
| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/gyms` | 암장 검색 (좌표·키워드·브랜드) |
| GET | `/api/v1/gyms/{extId}` | 암장 상세 |
| GET | `/api/v1/gyms/{extId}/routes` | 루트 목록 (활성, 인증 필요, 커서 페이지네이션 `?cursor=&size=`, id DESC) |
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
| GET | `/api/v1/me/stats/monthly` | 월별 통계 |

### 피드 (`/api/v1/feed-posts`)
| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/feed` | 홈 피드 (팔로우 기반) |
| GET | `/api/v1/feed-posts` | 전체·필터 피드 |
| POST | `/api/v1/feed-posts` | 피드 작성 |
| GET | `/api/v1/feed-posts/{extId}` | 게시물 상세 |
| PATCH | `/api/v1/feed-posts/{extId}` | 게시물 수정 |
| DELETE | `/api/v1/feed-posts/{extId}` | 게시물 삭제 |
| POST | `/api/v1/feed-posts/{extId}:like` | 좋아요 |
| DELETE | `/api/v1/feed-posts/{extId}:like` | 좋아요 취소 |
| GET | `/api/v1/feed-posts/{extId}/comments` | 댓글 목록 |
| POST | `/api/v1/feed-posts/{extId}/comments` | 댓글 작성 |
| DELETE | `/api/v1/comments/{extId}` | 댓글 삭제 |

### 미디어 (`/api/v1/media`)
| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/v1/media:prepareUpload` | S3 presigned PUT URL 발급 |
| POST | `/api/v1/media:confirmUpload` | 업로드 완료 통지 (클라→서버) |
| GET | `/api/v1/media/{extId}` | 미디어 상태 조회 |

## 12. 오픈 이슈

- [ ] 피드 랭킹 알고리즘: `/api/v1/feed` 내부에 구현 vs 별도 서비스
- [ ] 신고·차단 API 추가 시점
- [ ] GraphQL 검토 (Phase 2, 모바일 오버페칭 이슈 측정 후)
- [ ] 웹훅(파트너사 암장 정보 연동) Phase 2
