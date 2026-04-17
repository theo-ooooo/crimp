# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소의 코드를 다룰 때 참고하는 전역 안내서입니다.

## 프로젝트 개요

**Crimp**는 국내 클라이머를 대상으로 하는 디지털 홈 플랫폼입니다. 암장·루트 정보, 등반 기록, 크루·파트너 매칭, 피드 커뮤니티, 실내↔아웃도어 연계 가이드를 제공합니다.

- 서비스명: **Crimp** (크림프 — 작은 홀드를 움켜쥐는 클라이밍 동작)
- 저장소: [theo-ooooo/crimp](https://github.com/theo-ooooo/crimp) (Public, MIT)
- 기획 문서: [Notion — Crimp 서비스 기획서 (v0.1)](https://www.notion.so/345fbab2ef738182b16ad0029cfc5c0c)
- 프로젝트 단계: **Phase 1 (MVP)** — 2026-05 ~ 2026-07

## 서브 프로젝트 구조

루트는 top-level 구성(`app/`, `web/`, `docs/`, `infra/`, `agents/`)을 두고, 백엔드는 `api/` 디렉토리 **내부에서** Gradle 멀티모듈 레이어드 아키텍처로 구성한다.

| 디렉토리 | 역할 |
| --- | --- |
| `api/` | 백엔드 Gradle 멀티모듈 루트 (아래 5개 서브모듈) |
| `api/crimp-common/` | 공통 유틸·베이스·응답 포맷·예외·`@ConfigurationProperties` |
| `api/crimp-core/` | JPA 엔티티·Redis·DB 드라이버·Flyway 마이그레이션·QueryDSL |
| `api/crimp-domain/` | 도메인 서비스·DTO·JWT·비즈니스 로직 |
| `api/crimp-infra/` | 외부 연동 구현 (S3·Mail·OAuth provider 등) |
| `api/crimp-api/` | REST Controller·Security·Actuator·Swagger·메인 엔트리 (`bootJar`) |
| `app/` | 모바일 앱 (RN + TS) |
| `web/` | 웹 (Next.js 14 + TS) |
| `infra/` | 인프라 구성 (docker-compose·MySQL 초기화·예정 Terraform) |
| `docs/` | 설계·기획·운영 문서 |

의존 방향: `crimp-api → {common, core, domain, infra}` / `infra → {common, core, domain}` / `domain → core → common`.

각 서브 프로젝트가 생성되면 내부에 독립적인 CLAUDE.md를 두고, 해당 하위 디렉토리에서 작업 시 우선 참조합니다.

## 에이전트 위임 가이드

작업을 서브 에이전트에 위임할 때 다음 원칙을 따릅니다:

- **API/DB 관련** → `agents/backend.md`
  - REST 엔드포인트 추가/수정, JPA 엔티티, Celery/배치, 인증
  - 설정은 `@ConfigurationProperties` 기반으로 타입 안전하게 관리 (`@Value` 금지)
- **UI 관련** → `agents/frontend.md`
  - 화면·컴포넌트, 상태 관리, API 연동, 다국어(ko/en)
  - 앱과 웹의 디자인 토큰·컴포넌트 규약 공유
- **디자인/UX** → `agents/design.md`
  - 와이어프레임, 디자인 시스템, 사용성 검토, 접근성
- **문서/기획 산출물** → `agents/docs.md`
  - 기획·설계 문서, API 스펙, 릴리즈 노트, 운영 런북
- **QA/테스트** → `agents/qa.md`
  - 시나리오 설계, 통합/E2E, 보안 점검, 회귀 검증

## 프로젝트 간 공통 사항

### 데이터베이스
- MySQL 8.x + Redis 7
- 마이그레이션은 API 측 Flyway(또는 Liquibase) 단일 경로로 관리
- 스키마 변경은 설계 PR로 공유 후 merge

### 미디어
- 이미지·영상은 S3 업로드 → CloudFront 배포
- 영상 트랜스코딩: MediaConvert (Phase 1은 원본 + 1개 해상도)

### 인증/인가
- Kakao / Apple / Google OAuth2 → 서버에서 JWT 발급
- Access 15m / Refresh 14d, Refresh는 Redis 블랙리스트 운영

### 다국어 / 인코딩
- 기본 언어: 한국어 (ko)
- 지원: 한국어, 영어 (Phase 2에서 확장)
- 모든 텍스트 데이터는 UTF-8

### CI/CD
- GitHub Actions
- `main`: 프로덕션 배포 (수동 승인)
- `develop`: 스테이징 자동 배포
- 버전 관리: `bumpversion patch` (핫픽스) / `bumpversion minor` (릴리즈)

### 코딩 언어
- 코드 주석·문서·커밋 메시지의 기본 언어는 **한국어**

## AI 에이전트 오케스트레이션 파이프라인

Claude Code가 오케스트레이터 역할을 수행하며, GATE 승인 기반으로 개발 흐름을 관리합니다.

```
/기획시작 → GATE 1 승인
  → /설계시작 → GATE 2 승인
    → /backend시작 + /frontend시작 + /design시작 (병렬)
      → GATE 3 (DB 스키마 변경 검증)
        → /qa시작 → /docs시작
```

- GATE 승인은 사용자가 "기획 승인", "설계 승인" 등으로 입력
- 각 커맨드는 `agents/` 폴더의 해당 하네스를 먼저 로드한 뒤 실행
- 에이전트 하네스의 "반드시/금지" 규칙을 항상 준수

## 에이전트 구성

| 에이전트 | 파일 | 역할 | 기술 스택 |
| --- | --- | --- | --- |
| 백엔드 | `agents/backend.md` | REST API·DB·배치 구현 | Spring Boot / JPA / MySQL |
| 프론트엔드 | `agents/frontend.md` | 앱·웹 UI 구현 | React Native / Next.js / TS |
| 디자인 | `agents/design.md` | UX/UI·디자인 시스템 | Figma |
| 문서 | `agents/docs.md` | 기획·설계·운영 문서 | Markdown / OpenAPI |
| QA | `agents/qa.md` | 시나리오·통합·E2E 테스트 | Playwright / JUnit |

## 확정 기술 스택

```
Backend  : Java 21 / Spring Boot 3.x / JPA / MySQL 8.x / Redis 7
Mobile   : React Native / TypeScript / React Query / Zustand
Web      : Next.js 14 / TypeScript / TanStack Query
Infra    : AWS (ECS Fargate, RDS, S3, CloudFront, MediaConvert)
Auth     : OAuth2 (Kakao / Apple / Google) + JWT
CI/CD    : GitHub Actions
모니터링 : Grafana + Loki + Prometheus (또는 Datadog)
```

## 에이전트 간 격리 및 DB 동기화 원칙

### 코드 격리
각 에이전트는 자기 담당 디렉토리의 코드만 수정합니다. 타 영역 변경이 필요하면 해당 에이전트에 요청하거나 오케스트레이터에 에스컬레이션합니다.

| 에이전트 | 수정 가능 영역 |
| --- | --- |
| 백엔드 | `api/` (5개 서브모듈 전체) |
| 프론트엔드 | `app/`, `web/` |
| 디자인 | `docs/design/`, Figma 연동 파일 |
| 문서 | `docs/` (design 제외) |
| QA | `api/*/src/test/`, `app/__tests__/`, `e2e/` |

### DB 공유 자원
- 스키마 변경(DDL)은 백엔드 에이전트만 수행, 다른 에이전트는 요청만 가능
- 스키마 변경 요청 시 영향받는 모듈 목록을 반드시 명시
- 마이그레이션은 `api/crimp-core/src/main/resources/db/migration/` 단일 경로로 통합
- 변경 완료 후 `docs/설계/db-schema.md` 업데이트
- UI는 DB에 직접 접근하지 않음 (API 경유)

## GATE 승인 기준

| GATE | 조건 | 승인 방법 |
| --- | --- | --- |
| GATE 1 (기획→설계) | 기획문서 완성, 미결사항 0건 | "기획 승인" 또는 "설계 시작해" |
| GATE 2 (설계→구현) | 설계 산출물 완성, API 스펙 합의 | "설계 승인" 또는 "구현 시작해" |
| GATE 3 (DB 스키마) | DB 변경 시 마이그레이션 검증 | "DB 승인" 또는 자동 통과 |
| GATE 4 (QA→문서) | Critical/High 버그 0건 | QA 에이전트 자동 판단 |

## 코드 수정 및 테스트 규칙

### 수정-테스트 루프
```
수정 명세서 승인
  → 코드 수정
    → 단위 테스트 작성/실행
      → PASS (커버리지 80%+) → 커밋
      → FAIL → 원인 분석 → 코드 수정 → 단위 테스트 (반복, 최대 10회)
        → 10회 실패 → 설계 재검토 에스컬레이션
```

### 필수 규칙
- 코드 수정 시 반드시 해당 기능의 단위 테스트를 작성하거나 기존 테스트를 실행
- 테스트 커버리지 80% 미만이면 커밋 금지
- 수정 명세서에 명시되지 않은 파일/함수는 수정하지 않음
- 기존 코드의 리팩토링, 변수명 변경, import 정리 등 무관한 변경 금지

## Git Convention

- 브랜치: `feature/{기능}` / `fix/{버그}` / `improve/{기능}` / `change/{기능}`
- 커밋: `feat/fix/refactor/style/test/docs/chore/db: {내용}`
- 흐름: 품질검사 PASS → 커밋 → 코드 리뷰 요청 → 승인 → develop 머지

## 보조 커맨드

| 커맨드 | 용도 |
| --- | --- |
| `/기획시작` | 요구사항 토론 → 기획문서 작성 |
| `/설계시작` | 아키텍처·API·DB 설계 |
| `/backend시작` | Spring Boot API 구현 |
| `/frontend시작` | 앱·웹 UI 구현 |
| `/design시작` | 와이어프레임·디자인 시스템 |
| `/qa시작` | 시나리오·통합·E2E 테스트 |
| `/docs시작` | 문서·릴리즈 노트 작성 |
