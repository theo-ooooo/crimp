# crimp-api

Crimp 백엔드의 **API 모듈**. Spring Boot `bootJar` 를 생성하는 단일 배포 가능한 엔트리 포인트.

## 의존

```
crimp-api → crimp-common
         → crimp-core
         → crimp-domain
         → crimp-infra
```

## 책임

- REST Controller
- Spring Security 설정
- Swagger / OpenAPI (`/swagger-ui`, `/v3/api-docs`)
- Actuator 엔드포인트
- 메인 엔트리 (`CrimpApiApplication`)
- `application.yml` (프로파일별 포함)

## 로컬 실행

1. 의존 인프라 기동
   ```bash
   docker compose up -d       # 루트 docker-compose.yml
   ```
2. 앱 기동 (레포 루트에서)
   ```bash
   cd api && gradle :crimp-api:bootRun
   ```
3. 헬스 체크: <http://localhost:8080/v1/health>
4. Swagger UI: <http://localhost:8080/swagger-ui>

## 테스트

```bash
cd api && gradle :crimp-api:check
# 또는 전체
cd api && gradle check
```

자세한 규약은 [`../../agents/backend.md`](../../agents/backend.md) 참고.
