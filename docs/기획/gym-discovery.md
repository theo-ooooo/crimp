# 암장 탐색 (Gym Discovery) 기획 — v0.1

PRD §M3 "암장 검색·상세" 의 화면·기능 정식화. mock (`docs/design/claude/v2/screens-ios.jsx`) 의 풍부한 hero 디자인을 실 코드까지 끌어올리고, 카카오맵 통합 + 실시간 정보 (현재 운동중 인원 / 최근 활동) 를 도입한다.

작성일: 2026-05-04. Phase 1 후반 ~ Phase 1.5 진입 사이에 단계적 도입.

---

## 1. 의도

**문제**: 입문자가 "이 암장 분위기/난이도/현재 사람 많은가" 를 알 방법이 인스타·카톡방·블로그에 분산. PRD §3 의 "정보 파편화" 의 직접 해결.

**원칙**:
1. 한 화면 = 한 역할. 검색은 dense, 상세는 hero.
2. 실시간성 ↑: 영업 상태, 현재 운동중 인원, 최근 활동.
3. 위치 컨텍스트: 사용자 현재 위치 또는 main_gym 기준 거리 정렬.

---

## 2. 화면

### 2.1 암장 찾기 (`GymSearchScreen`)

**목적**: 사용자가 가까운/원하는 암장을 빠르게 찾기.

**섹션 (위에서 아래로)**:
1. 검색 input — 암장명/지역 키워드. debounced 300ms.
2. 필터 chip 가로 스크롤 — "내 근처" / "볼더링" / "리트" / "24시간" / "샤워실" 등.
3. **미니맵** (200dp 높이) — 검색 결과 마커 N개 + 사용자 현위치. 우상단 "지도 보기" 버튼 → 풀스크린 모달.
4. 정렬 toggle — "인기있는 곳" / "거리순".
5. 카드 리스트 — `GymSearchCard` (이니셜/이름/거리/별점/영업상태). 브랜드별로 동일한 lime 계열 비주얼을 사용하고, brand color 활용은 후속으로 미룸.

**상호작용**: 카드 탭 → `GymDetailScreen`. 마커 탭 → 카드로 스크롤 (또는 풀스크린 모달).

### 2.2 암장 상세 (`GymDetailScreen`)

**목적**: 한 암장의 분위기/현재 활동 노출 + 세션 시작 CTA.

**섹션 (위에서 아래로)**:
1. **Hero** — lime 그라디언트 + 홀드 dot 일러스트 (브랜딩). 우상단 (위치/공유/...) 액션. 좌상단 뒤로가기.
2. 영업 상태 chip — "영업중 22:00 마감" 또는 "오늘 휴무". `gym.opening_hours_json` 파싱.
3. 타이틀 — `gym.name`, 주소, 거리 (사용자 위치 기반). 위치 권한이 거부되면 `main_gym` 좌표로 fallback, 그것도 없으면 거리 표시는 숨김.
4. 메타 — 별점 (rating) / 등반수 (send_count) / 사용자수 (monthly_user_count). `rating` 이 null 이면 해당 chip 자체를 숨김.
5. **현재 세션** — 그레이드별 active 막대 차트 (V0~V8+).
6. **최근 활동** — 최근 N개 attempt: 사용자 아바타 + nickname + 그레이드 칩.
7. (Phase 1.5) 루트 / 세팅 정보 — 기존 `RoutesSection` 유지.
8. 하단 fixed CTA — "여기서 세션 시작" lime PrimaryButton.

---

## 3. 백엔드 인벤토리

### 3.1 신규 endpoints

| Endpoint | Query | Response | 비고 |
| --- | --- | --- | --- |
| `GET /api/v1/gyms` | `q`, `near=lat,lng`, `cursor`, `size` | `{ items: [GymItem], nextCursor }` | 검색 + 거리 정렬. 거리는 `ST_Distance_Sphere` (MySQL 8) 또는 haversine. |
| `GET /api/v1/gyms/{extId}/active-sessions` | — | `{ activeUsers: number, gradeBuckets: [{ grade: 'V0', count: 3 }, ...] }` | `climbing_sessions WHERE ended_at IS NULL` JOIN attempts grade count. |
| `GET /api/v1/gyms/{extId}/recent-activity` | `size?=10` | `{ items: [{ userExtId, nickname, avatarColorHue, gradeValue, result, loggedAt }] }` | 최근 attempt N건. 피드와 별도, gym 한정. |

### 3.2 메타데이터 보강

`gym_stats` 테이블 (또는 derived view):
- `gym_id` PK
- `rating` DECIMAL(2,1) — 사용자 리뷰 평균 (별도 review 도메인 필요 — 후속)
- `send_count` BIGINT — 누적 SEND/FLASH/ONSIGHT 수
- `monthly_user_count` BIGINT — 최근 30일 unique user 수
- `updated_at` TIMESTAMP

업데이트 정책: 일배치 (`@Scheduled` 자정) 또는 trigger. Phase 1 은 일배치로 충분.

리뷰 도메인이 없는 동안 `rating` 은 null/제외 노출 (UI 가 fallback).

---

## 4. 카카오맵 통합

**선택 라이브러리**: S1 작업에서 비교/결정.

**준비**:
- 카카오 디벨로퍼스 앱 등록 (사용자 액션) — bundle ID + package name + 키 해시.
- Native App Key 발급 → `KAKAO_NATIVE_APP_KEY` 시크릿 (staging/prod 분리).
- iOS Pod + Android Maven autolink.

**기능**:
- 미니맵 (200dp): 검색 결과 위치 마커 N개. 사용자 현위치 마커 (geolocation 권한 필요).
- 풀스크린 모달: 더 큰 지도 + 카드 캐러셀 (마커 탭 시 카드 highlight).
- 마커 탭 → 카드 자동 스크롤 또는 모달의 카드 캐러셀 페이지 이동.

---

## 5. 의존 관계 / 마일스톤

```
G1 (검색+거리) ─┬─> S2 (미니맵 마커)
                └─> D1 (거리 chip)
G2 (active)   ──> D2 (막대 차트)
G3 (recent)   ──> D3 (최근 활동)
G4 (stats)    ──> D1 (rating)
S1 (kakao native) ──> S2
```

**진행 순서**:
1. 카카오 dev 셋업 (사용자) + 기획 합의 (본 문서)
2. 백엔드 G1~G4 (병렬 가능)
3. 클라 D1~D3 / S1~S3 (의존 풀린 후 병렬)

---

## 6. 후속 / 미정

- 리뷰 도메인 (사용자가 gym 별 리뷰 작성) — 별점 기반의 데이터 출처. 별도 PRD/PR.
- 사용자 위치 권한 (`NSLocationWhenInUseUsageDescription` / Android `ACCESS_FINE_LOCATION`) — 거리 정렬의 옵션. 거부 시 main_gym 좌표 fallback, 그것도 없으면 거리 표시 X.
- 사진 갤러리 (gym 내부 사진) — 별도 도메인.
- "여기 새로 등록" — gym 신규 등록 요청 흐름. Phase 2 후보.
- prod 카카오맵 키와 staging 분리 — Native App Key 별도 발급 + fly secrets 환경별 분리.

---

## 7. 변경 이력

| 일자 | 변경 |
| --- | --- |
| 2026-05-04 | v0.1 작성 (Phase 1 후반 ~ 1.5 정식화) |
