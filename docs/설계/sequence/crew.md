# Crew Foundation — 설계

| 항목 | 내용 |
| --- | --- |
| 작성일 | 2026-05-08 |
| 작성자 | 강경원 (kwkang@ssrinc.co.kr) |
| 상태 | Draft (GATE 2 승인 대기) |
| 상위 문서 | [../../기획/crew.md](../../기획/crew.md) |
| 영향 영역 | API · DB · App · Web |

---

## 1. 도메인 모델

```mermaid
erDiagram
    users ||--o{ crews : owns
    gyms ||--o{ crews : "home gym"
    crews ||--o{ crew_members : has
    users ||--o{ crew_members : joins
    crews ||--o{ crew_join_requests : receives
    users ||--o{ crew_join_requests : requests
    crews ||--o{ meetups : schedules
    users ||--o{ meetups : creates
    meetups ||--o{ meetup_participants : has
    users ||--o{ meetup_participants : joins
```

### 1.1 상태 enum

| 필드 | 값 |
| --- | --- |
| `crews.visibility` | `PUBLIC`, `PRIVATE` (v0.1 생성은 PUBLIC 만) |
| `crews.join_policy` | `APPROVAL` (v0.1), `OPEN`, `INVITE_ONLY` (후속) |
| `crew_members.role` | `OWNER`, `ADMIN`, `MEMBER` |
| `crew_members.status` | `ACTIVE`, `LEFT`, `REMOVED` |
| `crew_join_requests.status` | `PENDING`, `APPROVED`, `REJECTED`, `CANCELED` |
| `meetups.join_policy` | `OPEN`, `APPROVAL` |
| `meetup_participants.status` | `PENDING`, `ACTIVE`, `CANCELED` |
| `crews.level_band` | `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `ALL` |
| `crews.style` | `BOULDERING`, `LEAD`, `BOTH` |

DB 는 `VARCHAR(20)` enum 문자열 저장을 기본으로 한다. 기존 숫자 enum과 섞이는 비용보다 운영 가독성이 중요하다.

---

## 2. 시퀀스 — 크루 생성

```mermaid
sequenceDiagram
    autonumber
    actor User as 사용자
    participant Client as App/Web
    participant API as CrewController
    participant Domain as CrewService
    participant DB as MySQL

    User->>Client: 크루 만들기 제출
    Client->>API: POST /api/v1/crews
    API->>Domain: createCrew(userId, command)
    Domain->>DB: gyms 존재/ACTIVE 확인 (homeGymExtId optional)
    Domain->>DB: crews insert
    Domain->>DB: crew_members insert role=OWNER status=ACTIVE
    DB-->>Domain: crew
    Domain-->>API: CrewDetail
    API-->>Client: 201 { crew }
```

검증:
- 이름 2~30자, 소개 0~500자.
- `capacity` 는 2~200, null 이면 정원 없음.
- `homeGymExtId` 가 있으면 ACTIVE gym 만 허용.
- 같은 사용자의 크루 생성은 Phase 1.5 에서 10개까지 제한한다.

---

## 3. 시퀀스 — 가입 요청/승인

```mermaid
sequenceDiagram
    autonumber
    actor Applicant as 가입 희망자
    actor Owner as 크루장
    participant Client as App/Web
    participant API as CrewController
    participant Domain as CrewService
    participant DB as MySQL

    Applicant->>Client: 가입 요청
    Client->>API: POST /api/v1/crews/{extId}/join-requests
    API->>Domain: requestJoin(userId, crewExtId, message)
    Domain->>DB: crew/member/request/capacity 검증
    Domain->>DB: crew_join_requests insert status=PENDING
    API-->>Client: 201 { request }

    Owner->>Client: 요청 승인
    Client->>API: POST /api/v1/crews/{extId}/join-requests/{requestExtId}:approve
    API->>Domain: approveJoinRequest(ownerId, crewExtId, requestExtId)
    Domain->>DB: owner/admin 권한 확인
    Domain->>DB: request status=PENDING lock
    Domain->>DB: capacity 재검증
    Domain->>DB: crew_members insert ACTIVE MEMBER
    Domain->>DB: request status=APPROVED
    API-->>Client: 200 { member }
```

동시성:
- 승인 시 요청 row 를 `FOR UPDATE` 로 잠근다.
- 정원이 있는 크루는 승인 직전에 ACTIVE 멤버 수를 재확인한다.
- `(crew_id, user_id, status)` unique 는 MySQL partial unique 를 직접 지원하지 않으므로, v0.1 은 서비스 트랜잭션 검증 + 인덱스 조합으로 시작한다.

---

## 4. API 계약

### 4.1 목록

`GET /api/v1/crews?q=&region=&gymExtId=&levelBand=&style=&cursor=&size=`

응답:
```json
{
  "items": [
    {
      "extId": "01JCREW...",
      "name": "강남 퇴근볼더",
      "summary": "평일 저녁 강남권 V3~V6",
      "region": "서울 강남",
      "homeGym": { "extId": "01JGYM...", "name": "더클라임 강남점" },
      "levelBand": "INTERMEDIATE",
      "style": "BOULDERING",
      "memberCount": 18,
      "capacity": 30,
      "joinPolicy": "APPROVAL",
      "myStatus": "NONE"
    }
  ],
  "page": { "nextCursor": 123, "size": 20 }
}
```

`myStatus`: `NONE`, `PENDING`, `MEMBER`, `OWNER`, `ADMIN`. 비로그인 목록을 열 경우 `NONE` 으로 고정하거나 인증 필요로 막는다. v0.1 은 인증 필요.

검색 정책:
- v0.1 은 베타 초기 데이터셋(수십~수백 crew)을 전제로 `name`/`summary`/`region` 부분 일치 검색을 사용한다.
- 데이터 증가로 응답 시간이 1초를 넘기면 `FULLTEXT` 인덱스 또는 별도 검색 인프라로 전환한다.
- 현재 정렬은 `id DESC` 커서 페이지네이션이며, 추천 랭킹은 후속 PR 에서 별도 설계한다.

### 4.2 상세

`GET /api/v1/crews/{extId}`

상세는 목록 필드에 `description`, `owner`, `createdAt` 을 추가한다.

### 4.3 쓰기

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/v1/crews` | 크루 생성 |
| PATCH | `/api/v1/crews/{extId}` | 크루 기본 정보 수정 |
| GET | `/api/v1/meetups?near=&lat=&lng=&levelBand=&style=&outdoor=` | 전체 예정 모임 목록 및 빠른 필터 |
| POST | `/api/v1/meetups` | 독립 모임 또는 크루 모임 생성 |
| GET | `/api/v1/meetups/{extId}` | 모임 상세 |
| PATCH | `/api/v1/meetups/{extId}` | 모임 관리자 수정 |
| POST | `/api/v1/meetups/{extId}/participants/me` | 모임 참여 또는 승인 요청 |
| DELETE | `/api/v1/meetups/{extId}/participants/me` | 내 모임 참여/요청 취소 |
| DELETE | `/api/v1/meetups/{extId}` | 모임 관리자 취소 |
| GET | `/api/v1/meetups/{extId}/participants?status=` | 모임 참여자/승인 요청 목록 |
| POST | `/api/v1/meetups/{extId}/participants/{userExtId}:approve` | 승인제 모임 요청 승인 |
| POST | `/api/v1/meetups/{extId}/participants/{userExtId}:reject` | 승인제 모임 요청 거절 |
| GET | `/api/v1/crews/{extId}/meetups` | 크루 예정 모임 목록 |
| POST | `/api/v1/crews/{extId}/meetups` | 크루장/관리자 모임 생성 |
| POST | `/api/v1/crews/{extId}/join-requests` | 가입 요청 |
| DELETE | `/api/v1/crews/{extId}/join-requests/me` | 내 대기 요청 취소 |
| GET | `/api/v1/crews/{extId}/join-requests` | 크루장/관리자 요청 목록 |
| POST | `/api/v1/crews/{extId}/join-requests/{requestExtId}:approve` | 가입 승인 |
| POST | `/api/v1/crews/{extId}/join-requests/{requestExtId}:reject` | 가입 거절 |
| GET | `/api/v1/crews/{extId}/members` | 멤버 목록 |
| DELETE | `/api/v1/crews/{extId}/members/me` | 크루 탈퇴 |
| DELETE | `/api/v1/crews/{extId}/members/{userExtId}` | 크루장/관리자 멤버 탈퇴 처리 |

---

## 4.4 대표 이미지와 모임

- 대표 이미지는 `POST /api/v1/media/presign { kind: "IMAGE", usage: "CREW" }` → object storage PUT → `POST /api/v1/media/{id}/complete` 로 READY 처리 후 크루 생성/수정의 `imageMediaId` 로 연결한다.
- 도메인은 이미지가 호출자 소유, `READY`, `IMAGE`, `CREW` usage 인지 검증한다. 수정에서 `clearImage=true` 와 `imageMediaId` 동시 전달은 거부한다.
- 모임은 전역 `meetups` 목록에서 조회한다. `crew_id` 는 nullable 이며 특정 크루 상세에서 만든 경우에만 연결된다.
- 모임 빠른 필터는 `근처`(앱이 위치 권한 요청 후 전달한 현재 좌표 기준), `입문/중급`(연결 크루 `levelBand`), `리드`(연결 크루 `style=LEAD|BOTH`), `외벽`(모임 제목/설명/장소 또는 암장 features 키워드) 로 매핑한다.
- 전역 모임 생성은 로그인 사용자 누구나 가능하다. 특정 크루 모임 생성은 `OWNER`/`ADMIN` 만 가능하다.
- v0.1 필드는 `title`, `description`, `startsAt`, `endsAt`, `gymExtId`, `location`, `capacity`, `joinPolicy` 이며 목록은 시작 시각 오름차순 최대 50개를 반환한다.
- 모임 생성자는 생성과 동시에 `meetup_participants.status=ACTIVE` 로 등록한다.
- 모임 생성자는 해당 모임의 방장이다. 독립 모임은 방장만 관리하고, 크루 모임은 방장과 크루 `OWNER`/`ADMIN` 이 관리한다.
- 모임 관리자는 시작 전 모임을 수정하거나 취소할 수 있다. 취소는 현재 `deleted_at` soft-delete 로 구현하며, 취소된 모임은 목록/상세에서 제외된다.
- 모임 참여 방식은 `OPEN` 과 `APPROVAL` 이다. `OPEN` 은 `meetup_participants.status=ACTIVE`, `APPROVAL` 은 요청 메시지(`message`)와 함께 `PENDING` 으로 생성한다.
- 승인제 모임의 `PENDING` 요청은 모임 관리자만 조회·승인·거절할 수 있다. 승인 시 정원을 재확인한다.
- 정원이 있는 모임은 `ACTIVE` 참여자 수 기준으로 제한한다. 승인 대기자는 정원 계산에 포함하지 않는다.
- App 생성 플로우는 `기본 정보 → 날짜/시간 달력 → 장소 선택(GymSearch/GymDetail 재사용) → 확인` 단계형으로 구성한다.

## 5. 에러 코드

| HTTP | code | 조건 |
| --- | --- | --- |
| 400 | `INVALID_CREW_REQUEST` | 필드 조합/길이 검증 실패 |
| 403 | `CREW_FORBIDDEN` | 크루장/관리자 권한 없음 |
| 404 | `CREW_NOT_FOUND` | 크루 없음 또는 비공개 접근 불가 |
| 404 | `CREW_JOIN_REQUEST_NOT_FOUND` | 가입 요청 없음 |
| 409 | `CREW_NAME_TAKEN` | 이름 중복 정책을 적용할 경우 |
| 409 | `CREW_ALREADY_MEMBER` | 이미 ACTIVE 멤버 |
| 409 | `CREW_JOIN_REQUEST_PENDING` | 이미 대기 요청 있음 |
| 409 | `CREW_CAPACITY_FULL` | 정원 초과 |
| 422 | `CREW_OWNER_LEAVE_BLOCKED` | 마지막 owner 탈퇴 시도 |

---

## 6. 클라이언트 화면

### 6.1 App

- `CrewListScreen`: 검색 input, 필터 chip, crew card list.
- `CrewDetailScreen`: 상세 정보 + 가입 CTA.
- `CrewFormScreen`: 생성/수정.
- `CrewJoinRequestsScreen`: owner/admin 전용 승인 목록.

### 6.2 Web

- `/crews`: 목록.
- `/crews/[extId]`: 상세.
- `/crews/new`: 생성.
- `/crews/[extId]/requests`: 요청 관리.

---

## 7. 구현 순서

1. DB migration + domain entity/repository.
2. API read path: 목록/상세 + `myStatus`.
3. API write path: 생성/수정 + 가입 요청/승인/거절.
4. App/Web 목록·상세.
5. App/Web 생성·요청 관리.

---

## 8. 후속 결정

- 크루 이름 전역 unique 여부. v0.1 기본안은 전역 unique 로 단순화.
- `PRIVATE`/초대 링크 도입 시점.
- 멤버 강제 추방과 owner 양도 정책.
- 알림 도메인 연결 방식.

## 9. 계정 탈퇴와 재가입

- 회원 탈퇴는 `users` 를 soft-delete 하되, 공개 컨텐츠 이력은 삭제하지 않는다. 공개 응답에서는 탈퇴 사용자의 `userExtId` 를 `null`, 닉네임을 `탈퇴사용자` 로 익명화한다.
- 탈퇴 시 대기 중인 `crew_join_requests` 는 `CANCELED` 로 정리하고, ACTIVE `crew_members` 는 `LEFT` 로 전환하며 크루 `member_count` 를 차감한다.
- 탈퇴 사용자가 크루의 마지막 `OWNER` 이면 owner 없는 크루가 남지 않도록 해당 `crews.deleted_at` 을 설정한다. 다른 ACTIVE owner 가 있으면 크루는 유지한다.
- 같은 OAuth 계정으로 재가입하면 새 user 행을 만들고 OAuth identity 를 새 user 로 재연결한다. 새 user 는 기존 탈퇴 user 의 `crew_members` PK 와 무관하므로 같은 크루에 새 가입 요청을 보낼 수 있다.
- 크루 탈퇴(`DELETE /crews/{extId}/members/me`)는 계정 탈퇴와 별개이며, `LEFT` 멤버는 승인 시 기존 `crew_members` 행을 `ACTIVE MEMBER` 로 재활성화한다.
