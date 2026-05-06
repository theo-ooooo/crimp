# 유저 스토리 — Phase 1 MVP

| 항목 | 내용 |
| --- | --- |
| 작성일 | 2026-04-27 |
| 작성자 | 강경원 |
| 상태 | Draft (GATE 1 승인 대기) |
| 핵심 페르소나 | 현우 (중급자) — [persona.md](./persona.md) §2 |
| 형식 | `As a <role>, I want <goal>, so that <benefit>` |

---

## US-CONVENTION

- ID 는 `US-<도메인>-<번호>` 형식 (예: `US-AUTH-01`)
- Acceptance Criteria 는 [GIVEN/WHEN/THEN](https://martinfowler.com/bliki/GivenWhenThen.html) 또는 체크리스트
- 진척도는 [PRD §6.1](./prd.md#61-must-have-phase-1-3개월) 의 Mxx 와 1:1 매핑

---

## 인증 (M1, M7)

### US-AUTH-01: 카카오로 1초 로그인 ✅

> **As a** 클라이머 (현우, 지수)
> **I want** 카카오 계정으로 한 번에 로그인하고
> **So that** 매번 비밀번호 입력 없이 곧장 등반 기록을 시작할 수 있다.

**Acceptance Criteria**
- [x] 앱·웹 양쪽에서 카카오 OAuth 동작 (Kakao OIDC v2 redirect)
- [x] 토큰 발급 후 메인 화면 자동 진입
- [x] 카카오 SDK 미설정 환경에선 dev 모드 (id_token 직입력) fallback

**구현**: PR #64 (web v2 redirect), 백엔드 `AuthController#exchange`

---

### US-AUTH-02: 토큰 만료 시 자동 복구 ✅

> **As a** 클라이머
> **I want** 로그인 상태가 자동으로 갱신되거나
> **So that** 15분마다 다시 로그인하지 않아도 된다.

**Acceptance Criteria**
- [x] access token 만료 시 refresh 토큰으로 자동 재발급
- [x] 동시 401 발생 시 refresh 호출은 1번만 (race 보호)
- [x] refresh 도 실패하면 토큰 정리 후 `/login` 리다이렉트

**구현**: PR #70 (web), #72 (app) — 2026-04-27 머지

---

### US-AUTH-03: 명시적 로그아웃 ✅

> **As a** 클라이머
> **I want** 프로필 화면에서 로그아웃 버튼을 누를 수 있고
> **So that** 다른 기기에서 안전하게 세션을 끊을 수 있다.

**Acceptance Criteria**
- [x] `/me` (web) / ProfileScreen (app) 하단에 로그아웃 버튼
- [x] 클릭 시 백엔드 refresh 토큰 블랙리스트 등록
- [x] 로컬 스토어 정리 + 로그인 화면 reset

**구현**: PR #71 (web), #72 (app) — 2026-04-27 머지

---

### US-AUTH-04: 계정 탈퇴 (Phase 1.5)

> **As a** 클라이머
> **I want** 앱/웹에서 계정을 탈퇴할 수 있고
> **So that** 더 이상 서비스를 쓰지 않을 때 내 계정과 개인정보 처리를 직접 요청할 수 있다.

**Acceptance Criteria**
- [ ] app/web 프로필 또는 설정 화면에 탈퇴 진입점 제공
- [ ] 탈퇴 전 확인 모달: 되돌릴 수 있는 기간, 삭제/익명화 범위, 재로그인 영향 안내
- [ ] 백엔드 `DELETE /api/v1/me` 또는 `POST /api/v1/me:delete` 구현
- [ ] refresh token 폐기 + 로컬 토큰 정리 + 로그인 화면 reset
- [ ] `users.status=DELETED` soft delete 및 30일 복구 정책 확정
- [ ] 게시물/댓글/시도/미디어 처리 정책 확정: 삭제, 익명화, 또는 보관 범위 명시

**정책 메모**
- Phase 1.5 기본안: 사용자 계정은 soft delete, 인증 식별자 재사용은 복구 기간 동안 차단.
- 공개 피드에 노출된 컨텐츠는 작성자 익명화 우선, 개인정보성 프로필 필드는 즉시 비노출.

---

## 프로필 (M2)

### US-PROF-01: 내 암장 설정

> **As a** 현우
> **I want** 자주 가는 암장을 "내 암장" 으로 등록하고
> **So that** 피드 "내 암장" 탭과 홈 추천을 그 암장 기준으로 받을 수 있다.

**Acceptance Criteria**
- [x] 백엔드: Profile.mainGymId 컬럼 + PATCH /api/v1/me/profile
- [x] web: `/me` MainGymSection 완료
- [x] app: ProfileScreen MainGymPickerModal 보완 (암장 검색·선택·해제 UI)

**진척**: web/app 완료 — Phase 1 must-fix 해소

---

### US-PROF-02: 닉네임·자기소개·레벨 편집 (Phase 1.5)

> **As a** 클라이머
> **I want** 닉네임·소개·자가 등급을 편집하고
> **So that** 피드/크루에서 나를 표현할 수 있다.

**Acceptance Criteria**
- [ ] PATCH /api/v1/me/profile 의 nickname/bio/levelSelf 모두 web/app UI 지원
- [ ] 닉네임 중복 검증
- [ ] 자가 등급 슬라이더 (V0~V12)

---

### US-PROF-03: 프로필 이미지 업로드 (Phase 1.5)

> **As a** 클라이머
> **I want** 내 프로필 이미지를 직접 업로드하고 변경할 수 있고
> **So that** 피드/암장 활동/댓글에서 나를 쉽게 알아볼 수 있다.

**Acceptance Criteria**
- [ ] app/web 프로필 편집 화면에서 이미지 선택·촬영·삭제 지원
- [ ] 업로드는 기존 media presign/complete 흐름 재사용
- [ ] 완료된 이미지 media id 를 `profiles.avatar_media_id` 에 연결
- [ ] 이미지 제한: 정사각형 crop 권장, 최대 해상도/용량 제한, JPEG/WebP 변환 정책 확정
- [ ] `GET /api/v1/me`, `GET /api/v1/users/{extId}`, 피드/댓글/암장 최근활동 응답에 avatar URL 노출
- [ ] 실패 시 기존 아바타 유지, 업로드 중 저장 버튼 중복 방지

**정책 메모**
- 기본 placeholder 는 기존 이니셜/색상 아바타를 유지한다.
- 탈퇴 시 avatar media 는 비공개 처리 또는 삭제 대상으로 포함한다.

---

## 암장 (M3)

### US-GYM-01: 암장 검색

> **As a** 지수, 현우
> **I want** 이름·지역·브랜드로 암장을 검색하고
> **So that** 새로 갈 암장을 후보로 볼 수 있다.

**Acceptance Criteria**
- [x] web `/gyms` + app GymSearchScreen 완료
- [ ] 시드 데이터 30곳 (수도권) 투입
- [ ] 검색 결과 정렬 (거리·인기·이름)

---

### US-GYM-02: 암장 상세

> **As a** 클라이머
> **I want** 암장 상세 (영업·전화·세팅 주기·시설) 를 확인하고
> **So that** 방문 결정을 내릴 수 있다.

**Acceptance Criteria**
- [x] web `/gyms/[extId]` + app GymDetailScreen 완료
- [x] 활성 루트 리스트 (인증 후만)
- [ ] "이 암장에서 세션 시작" CTA 흐름 확인

---

## 등반 로그 (M4)

### US-LOG-01: 세션 시작·종료

> **As a** 현우
> **I want** 암장 입장 시 세션을 시작하고 끝날 때 종료하여
> **So that** 그 시간 동안의 시도를 한 묶음으로 모을 수 있다.

**Acceptance Criteria**
- [x] POST /api/v1/sessions, PATCH ...
- [x] web `/sessions/new` + app StartSessionScreen
- [x] 세션 상세에서 "세션 종료" 버튼

---

### US-LOG-02: 시도 로그 (완등/실패/그레이드/홀드 색)

> **As a** 현우
> **I want** 한 시도마다 결과·그레이드·홀드 색·메모를 남기고
> **So that** 나중에 진척도와 패턴을 분석할 수 있다.

**Acceptance Criteria**
- [x] LogAttemptSheet 완료 (web + app)
- [x] 결과: SEND/FLASH/ONSIGHT/TRY/FAIL
- [x] 그레이드 freeform (V·5.x·Font 혼용 허용)
- [x] 홀드 색 칩
- [ ] 카메라 캡처 (F5 — placeholder 상태)

---

### US-LOG-03: 세션·시도 통계

> **As a** 현우
> **I want** 이번 주 완등 수, 최고 그레이드, 누적 세션을 한눈에 보고
> **So that** 진척도가 시각적으로 동기를 준다.

**Acceptance Criteria**
- [x] GET /api/v1/me/stats (weekSends, weekSessions, totalSessions, totalSends, topGrade, weekRange)
- [x] web 홈 + `/me` + app HomeScreen + ProfileScreen 통합

---

## 피드 (M5, M6)

### US-FEED-01: 피드 둘러보기

> **As a** 현우
> **I want** 친구·인기·내 암장 탭으로 다른 클라이머의 등반을 보고
> **So that** 자극과 영감을 받는다.

**Acceptance Criteria**
- [x] GET /api/v1/feed?filter=...&cursor=...
- [x] web `/feed` + app FeedScreen 완료
- [x] 필터 3종 (FRIENDS / POPULAR / MY_GYM)
- [ ] 친구 도메인 미구현 → friends 탭 빈 상태 안내

---

### US-FEED-02: 좋아요·댓글

> **As a** 클라이머
> **I want** 다른 사람의 완등에 좋아요와 댓글을 남기고
> **So that** 응원과 대화를 시작할 수 있다.

**Acceptance Criteria**
- [x] POST /api/v1/feed/posts/{id}/like 토글
- [x] GET·POST /api/v1/feed/posts/{id}/comments
- [x] web 댓글 다이얼로그 + app 댓글 시트
- [ ] 본인 댓글 삭제 흐름 마무리

---

### US-FEED-03: 자동 게시 (등반 → 피드)

> **As a** 현우
> **I want** 시도 결과 SEND/FLASH/ONSIGHT 면 자동으로 피드에 올라가고
> **So that** 따로 공유 액션 없이도 동료가 볼 수 있다.

**Acceptance Criteria**
- [x] FeedPost 자동 생성 (LogAttempt 트리거)
- [x] feed_posts 테이블 + 인덱스
- [ ] (Phase 1.5) on/off 토글 (프라이버시)

---

## 비기능 (Cross-cutting)

### US-NFR-01: 토큰 보안

> 사용자가 평문 localStorage 의 토큰이 XSS 로 유출되지 않아야 한다.

**Acceptance Criteria**
- [ ] HttpOnly 쿠키 + CSRF 토큰 전환
- [ ] **베타 진입 전 필수** (PRD §11 리스크)

---

### US-NFR-02: 로그인 가드

> 비로그인 상태로 인증 필요 페이지에 진입하면 즉시 로그인 화면으로 이동.

**Acceptance Criteria**
- [x] web: useRequireAuth 훅 (PR #73)
- [x] app: RootStack 의 accessToken 분기 (App.tsx)

---

### US-NFR-03: 다국어 (ko/en)

**Acceptance Criteria**
- [x] 모든 UI 문자열 i18n 키 사용
- [x] ko.json / en.json 동등 키
- [ ] 자동 lint (unused key)

---

## Phase 1.5 후속 백로그 요약

스토리는 별도 추가하지 않고 PRD §6.2 항목으로 관리.

- 크루 / 파트너 매칭
- 영상 타임라인 주석
- BottomTabs 정식 (web)
- 크루 가입률·D30 KPI 측정 인프라

---

## Phase 2+ Out of Scope

- 아웃도어 가이드, 이벤트 티켓팅, AI 분석, 커머스 — 별도 기획 사이클.
