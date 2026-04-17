# crimp-api

Crimp의 REST API. Spring Boot 3.3 / Java 21 / MySQL 8 / Redis 7 / Flyway.

## 로컬 실행

1. 의존 인프라 기동 (루트 `docker-compose.yml` 예정)
   ```bash
   docker compose up -d mysql redis
   ```
2. DB 생성 (최초 1회)
   ```bash
   docker exec -it crimp-mysql mysql -uroot -proot \
     -e "CREATE DATABASE IF NOT EXISTS crimp DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
   ```
3. 애플리케이션 구동
   ```bash
   ./gradlew bootRun
   ```
4. 헬스 체크: <http://localhost:8080/v1/health>
5. Swagger UI: <http://localhost:8080/swagger-ui>

## 환경 변수

| 키 | 기본값 | 설명 |
| --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | `local` | 프로파일 |
| `DB_URL` | `jdbc:mysql://localhost:3306/crimp?...` | JDBC URL |
| `DB_USER` / `DB_PASSWORD` | `crimp` / `crimp` | DB 계정 |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` | Redis |
| `S3_BUCKET` | `crimp-media-dev` | 미디어 버킷 |
| `CDN_BASE` | `https://dev-cdn.crimp.local` | CDN 베이스 |

## 규약

- 설정 값은 **`@ConfigurationProperties`** 로 타입 안전하게. `@Value` 금지.
- DTO/Entity 분리, 컨트롤러에 Entity 노출 금지.
- 모든 엔드포인트 OpenAPI 스펙 주석.
- 통합 테스트는 Testcontainers(`mysql:8.0`)로 실제 DB 검증.
- 문자셋: `utf8mb4` + `utf8mb4_0900_ai_ci` 고정.

자세한 규약은 [`../agents/backend.md`](../agents/backend.md) 참고.

## 테스트

```bash
./gradlew test
./gradlew check   # spotless + test
```

## 주요 경로

```
api/
├── src/main/java/io/crimp/
│   ├── CrimpApiApplication.java
│   ├── common/
│   │   ├── config/AppProperties.java
│   │   └── web/HealthController.java
│   ├── auth/          # 예정
│   ├── user/          # 예정
│   ├── gym/           # 예정
│   ├── log/           # 예정
│   ├── feed/          # 예정
│   ├── crew/          # 예정
│   └── media/         # 예정
├── src/main/resources/
│   ├── application.yml
│   └── db/migration/
│       └── V202605010900__init_users.sql
└── src/test/java/io/crimp/CrimpApiApplicationTests.java
```
