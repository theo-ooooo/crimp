# 피드 시퀀스

| 항목 | 내용 |
| --- | --- |
| 작성일 | 2026-04-17 |
| 상태 | Draft |

## 1. 피드 작성

```mermaid
sequenceDiagram
    autonumber
    actor U as 사용자
    participant App
    participant API
    participant S3
    participant DB
    participant Redis

    U->>App: 피드 작성 화면
    U->>App: 사진/영상 선택
    loop 미디어별
        App->>API: POST /api/v1/media:prepareUpload
        API-->>App: { extId, uploadUrl }
        App->>S3: PUT uploadUrl
        App->>API: POST /api/v1/media:confirmUpload { extId }
    end
    U->>App: 텍스트 작성 + 세션 연결 + 게시
    App->>API: POST /api/v1/feed-posts { content, mediaIds, sessionId?, gymId?, visibility }
    API->>DB: INSERT feed_posts + post_media (트랜잭션)
    API->>Redis: DEL user:{id}:home:* (캐시 무효화)
    API->>Redis: LPUSH fanout:queue { postId }
    API-->>App: 201 { post }
    App-->>U: 피드 상단에 노출
```

## 2. 홈 피드 조회 (Pull 모델 + 캐시)

```mermaid
sequenceDiagram
    participant App
    participant API
    participant Redis
    participant DB

    App->>API: GET /api/v1/feed?cursor=null&size=20
    API->>Redis: GET home:{userId}:cursor:null
    alt 캐시 히트
        Redis-->>API: JSON (posts + nextCursor)
    else 미스
        API->>DB: SELECT posts WHERE user IN (followees) ORDER BY created_at DESC LIMIT 21
        DB-->>API: rows
        API->>API: 다음 커서 계산, 미디어·좋아요 여부 조인
        API->>Redis: SETEX home:{userId}:cursor:null 60
    end
    API-->>App: { data, page: { nextCursor } }
```

- 팔로우가 많지 않은 MVP는 Pull 모델, 인기 유저 등장 시 Hybrid(Push to Home Timeline) 도입 검토

## 3. 좋아요·카운터

```mermaid
sequenceDiagram
    actor U
    participant App
    participant API
    participant Redis
    participant DB
    participant Batch as 카운터 Flush 배치

    U->>App: 하트 탭
    App->>API: POST /api/v1/feed-posts/{extId}:like
    API->>DB: INSERT IGNORE likes
    alt 신규
        API->>Redis: INCR post:{id}:likes_delta
        API-->>App: 200
    else 중복
        API-->>App: 200 (멱등)
    end

    Note over Batch: 1분 주기
    Batch->>Redis: GETSET post:*:likes_delta 0 (모든 포스트)
    Batch->>DB: UPDATE feed_posts SET like_count = like_count + delta
```

## 4. 댓글

```mermaid
sequenceDiagram
    actor U
    participant App
    participant API
    participant DB
    participant Notify as 알림 워커

    U->>App: 댓글 입력 → 전송
    App->>API: POST /api/v1/feed-posts/{extId}/comments { content, parentId? }
    API->>DB: INSERT comments
    API->>DB: UPDATE feed_posts SET comment_count = comment_count + 1
    API->>SQS: publish { type:'COMMENT', postId, commentId }
    API-->>App: 201 { comment }
    Note over Notify: 비동기
    SQS-->>Notify: poll
    Notify->>DB: SELECT post.user_id (게시자)
    Notify->>FCM: push 알림 (게시자에게)
```

## 5. 조회·상세·수정·삭제

- 상세: `GET /api/v1/feed-posts/{extId}` — 댓글 최초 20개 포함, 이후 `GET /comments`로 페이지네이션
- 수정: `PATCH /api/v1/feed-posts/{extId}` — 작성자만, 15분 내 편집, 이후는 삭제 후 재작성
- 삭제: `DELETE /api/v1/feed-posts/{extId}` — 소프트 딜리트, 피드 목록에서 제외

## 6. 예외·엣지

| 케이스 | 처리 |
| --- | --- |
| 본인이 본인 게시물에 좋아요 | 허용 (정책), like_count 증가 |
| 탈퇴 사용자 게시물 | 게시물은 유지. 작성자 `userExtId=null/누락`, 닉네임 `탈퇴사용자`, `avatarColorHue=0`, 프로필 이미지 비노출 |
| 신고된 게시물 | `visibility=HIDDEN` 임시 값 (Phase 1.5에서 신고 테이블 추가) |
| 미디어 처리 실패 | 게시물은 유지, 해당 미디어만 placeholder로 노출 |
| 팔로우 0명 | 기본 피드: 전체 공개 최신순 20개 |
