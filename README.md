# 🧗 climbing-community

국내 클라이머를 위한 디지털 홈 — 암장·루트·등반 로그·크루·아웃도어를 한 곳에서.

## 현재 단계

**Phase 1 MVP** (2026-05 ~ 2026-07)

- [ ] 소셜 로그인 (Kakao / Apple / Google)
- [ ] 프로필
- [ ] 암장 검색·상세 (수도권 Seed 30곳)
- [ ] 등반 세션·시도 로그
- [ ] 피드 (텍스트 + 이미지 + 영상)
- [ ] 좋아요 / 댓글

## 구성

| 디렉토리 | 내용 |
| --- | --- |
| `api/` | Spring Boot 3.x REST API (Java 21, JPA, MySQL) |
| `app/` | React Native 모바일 앱 (iOS / Android) |
| `web/` | Next.js 14 랜딩·관리자 콘솔 |
| `infra/` | Terraform + GitHub Actions |
| `docs/` | 기획·설계·운영 문서 ([index](./docs/README.md)) |
| `agents/` | AI 에이전트 하네스 (backend·frontend·design·docs·qa) |

## 주요 문서

- 기획서: [Notion — 클라이밍 커뮤니티 서비스 기획서](https://www.notion.so/345fbab2ef738182b16ad0029cfc5c0c)
- 아키텍처: [`docs/설계/architecture.md`](./docs/설계/architecture.md)
- DB 스키마: [`docs/설계/db-schema.md`](./docs/설계/db-schema.md)
- API 가이드: [`docs/설계/api-guide.md`](./docs/설계/api-guide.md)
- 에이전트·오케스트레이션: [`CLAUDE.md`](./CLAUDE.md)

## 기술 스택

```
Backend  : Java 21 / Spring Boot 3.x / JPA / MySQL 8.x / Redis 7
Mobile   : React Native / TypeScript / React Query / Zustand
Web      : Next.js 14 / TypeScript / TanStack Query
Infra    : AWS (ECS Fargate, RDS, S3, CloudFront, MediaConvert)
Auth     : OAuth2 (Kakao / Apple / Google) + JWT
CI/CD    : GitHub Actions
```

## 라이선스

미정 (MVP 이후 결정)
