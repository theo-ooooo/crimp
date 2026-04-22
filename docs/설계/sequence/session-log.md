# 등반 세션 로그 시퀀스

| 항목 | 내용 |
| --- | --- |
| 작성일 | 2026-04-17 |
| 상태 | Draft |

## 1. 세션 시작 → 시도 추가 → 종료

```mermaid
sequenceDiagram
    autonumber
    actor U as 사용자
    participant App
    participant API
    participant DB as MySQL
    participant Redis

    U->>App: "오늘 운동 시작"
    App->>API: POST /api/v1/sessions { gymId, startedAt }
    API->>DB: INSERT climbing_sessions (status: open)
    DB-->>API: session.extId
    API-->>App: { session }
    App->>App: 세션 로컬 캐시 (오프라인 대비)

    loop 매 시도
        U->>App: 루트 선택 + 결과 입력
        App->>API: POST /api/v1/sessions/{extId}/attempts { routeId, result, attempts, grade, tags, mediaId? }
        API->>DB: INSERT session_attempts
        API->>Redis: INCR user:{id}:today:attempts
        API-->>App: { attempt }
    end

    U->>App: "운동 종료"
    App->>API: PATCH /api/v1/sessions/{extId} { endedAt }
    API->>DB: UPDATE climbing_sessions SET ended_at, duration_min
    API->>Redis: SET user:{id}:last_session {session}
    API-->>App: { session }
    App-->>U: 오늘 완등 요약 화면
```

## 2. 오프라인 로깅 (앱 로컬 저장)

```mermaid
sequenceDiagram
    actor U
    participant App
    participant Local as 로컬 DB (SQLite/MMKV)
    participant API

    U->>App: 시도 입력 (네트워크 없음)
    App->>Local: pending_attempts 큐에 저장
    Note over App: 네트워크 복구 시 트리거
    App->>API: POST /api/v1/sessions/{extId}/attempts (배치)
    API-->>App: 201 (idempotency key 포함)
    App->>Local: 큐에서 제거
```

- 앱은 각 attempt에 UUID 생성 → `Idempotency-Key` 헤더로 전송 → 서버 측 중복 방지

## 3. 영상 첨부 흐름 (attempt에 영상 붙이기)

```mermaid
sequenceDiagram
    participant App
    participant API
    participant S3
    participant MC as MediaConvert
    participant SQS

    App->>API: POST /api/v1/media:prepareUpload { mime, size, kind:VIDEO }
    API-->>App: { media.extId, uploadUrl, s3Key }
    App->>S3: PUT uploadUrl (원본 업로드)
    S3-->>App: 200
    App->>API: POST /api/v1/media:confirmUpload { extId }
    API->>SQS: send { mediaId } (processing queue)
    API-->>App: { media: status=PROCESSING }

    par 백그라운드
        SQS-->>Worker: poll
        Worker->>MC: createJob (원본 → 720p + 썸네일)
        MC-->>Worker: jobId
        Note over MC: 트랜스코딩 (비동기)
        MC-->>SQS: done event
        SQS-->>Worker: poll
        Worker->>API: internal update
        API->>DB: UPDATE media_assets SET status=READY, variants, cdn_url
    end

    App->>API: POST /api/v1/sessions/{extId}/attempts { mediaId, ... }
    Note over App,API: media 상태가 READY가 아니어도 attempt 생성은 허용, 클라에서 처리중 표시
```

## 4. 월별 통계 조회

```mermaid
sequenceDiagram
    participant App
    participant API
    participant Redis
    participant DB

    App->>API: GET /api/v1/me/stats/monthly?year=2026&month=4
    API->>Redis: GET stats:{userId}:2026-04
    alt 캐시 히트
        Redis-->>API: JSON
    else 미스
        API->>DB: 집계 쿼리 (GROUP BY grade, result)
        DB-->>API: rows
        API->>Redis: SETEX stats:... EX 600
    end
    API-->>App: { monthly summary, topGrades, sessionCount }
```

## 5. 예외·엣지

| 케이스 | 처리 |
| --- | --- |
| 세션이 종료되지 않은 채 24h 초과 | 배치가 자동 종료 (ended_at=last_attempt + 30m) |
| 삭제된 루트에 attempt 추가 | 허용하되 route_id NULL, grade 수기 입력 |
| 외부 암장(자연암장) 기록 | gym_id NULL, gym_name_raw 사용 |
| 시도 수정 권한 | 본인만 (작성 후 7일 내), 이후 admin 경유 |
| 영상 업로드 실패 | presigned URL 만료 10분, 재요청 필요 |
