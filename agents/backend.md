# 백엔드 에이전트 하네스

Spring Boot 기반 REST API를 구현하는 에이전트입니다.

## 담당 범위

- `api/` 디렉토리 전체
- REST 엔드포인트 설계·구현
- JPA 엔티티·리포지토리·서비스 계층
- 인증/인가 (OAuth2 + JWT)
- 배치·스케줄러 (Spring Batch, `@Scheduled`)
- 미디어 업로드 처리 (S3 presigned URL)
- DB 마이그레이션 (Flyway)

## 기술 스택

- Java 21
- Spring Boot 3.x, Spring Security, Spring Data JPA
- MySQL 8.x, Redis 7
- Flyway (마이그레이션)
- JUnit 5, Mockito, Testcontainers
- Gradle (Kotlin DSL)

## 반드시 준수

- 설정 값은 **`@ConfigurationProperties` 기반으로 타입 안전하게 관리**한다. `@Value` 사용 금지
- DTO/Entity를 분리하고, Entity를 컨트롤러까지 노출하지 않는다
- 모든 엔드포인트에 OpenAPI(springdoc) 스펙 주석을 단다
- 테스트: 서비스 계층은 Mockito, 리포지토리·통합 테스트는 Testcontainers(MySQL)로 실제 DB 검증
- 트랜잭션 경계는 서비스 계층에서만 선언 (`@Transactional`)
- Lombok 사용 시 `@Data` 금지 (`@Getter`, `@RequiredArgsConstructor` 등 명시적 어노테이션 사용)
- 모든 커밋 전 `./gradlew test` 통과
- 외부 credential은 Parameter Store / Secrets Manager에서 로드, 코드/설정 파일에 평문 금지

## 금지

- `api/` 외 디렉토리 수정
- DB 스키마 변경을 **오케스트레이터 승인 없이** 수행
- `SELECT *` / `find{All}()` 그대로 리스트 API에 노출 (페이지네이션 필수)
- 순환 참조를 가진 Entity 그래프
- Controller에서 직접 Repository 호출 (반드시 Service 경유)

## 결과물 (Deliverable)

1. `api/src/main/java/...` 소스 코드
2. `api/src/test/java/...` 테스트 코드
3. `api/src/main/resources/db/migration/V*__*.sql` (스키마 변경 시)
4. OpenAPI 스펙 업데이트 (`/v3/api-docs`)
5. PR 본문에 변경 요약·영향도·테스트 결과

## 주요 모듈 (제안)

```
api/src/main/java/com/climbing/community/
├── auth/       # OAuth2, JWT, 사용자 인증
├── user/       # 프로필, 팔로우, 설정
├── gym/        # 암장·루트 정보
├── log/        # 등반 기록 (세션, 시도, 완등)
├── feed/       # 피드, 좋아요, 댓글
├── crew/       # 크루·파트너 매칭
└── media/      # S3 업로드, 썸네일, 트랜스코딩 콜백
```

## MySQL 규약

### 문자셋·콜레이션
- 모든 테이블·컬럼: `utf8mb4` / `utf8mb4_0900_ai_ci` 고정 (이모지·클라이밍 영상 제목·다국어 대응)
- 스키마 생성 시 DDL에 `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci` 명시
- `application.yml`의 JDBC URL에 `?characterEncoding=UTF-8&useUnicode=true` 포함

### 타임존
- 서버·DB 모두 **UTC 저장**, 조회 시점에만 KST 변환
- JDBC URL에 `serverTimezone=UTC`, 엔티티는 `LocalDateTime` 대신 `Instant` 권장

### 타입 선택
- PK: `BIGINT UNSIGNED AUTO_INCREMENT` (UUID가 필요한 외부 노출용 ID는 별도 컬럼)
- 금액·좌표: `DECIMAL(precision, scale)` — `FLOAT`/`DOUBLE` 금지
- 플래그: `TINYINT(1)` — `BIT` 금지 (JPA 매핑 이슈)
- JSON 컬럼: 피드 메타데이터·로그 태그·운영 설정에 MySQL 8 `JSON` 타입 활용. 쿼리 필요 시 생성 컬럼(`STORED`)으로 인덱싱

### 인덱스·쿼리
- 커버링 인덱스 우선 설계, `EXPLAIN`으로 실행 계획 검증 후 머지
- 리스트 API는 **커서 기반 페이지네이션** (OFFSET 페이지네이션은 10K row 이상에서 금지)
- `LIKE '%foo%'`는 Full-Text Index 또는 검색 엔진으로 이관 (기본 B-tree 인덱스 미활용)
- 소프트 딜리트 컬럼은 `deleted_at TIMESTAMP NULL` + 유니크 인덱스 시 함께 포함

### 마이그레이션 (Flyway)
- 파일명: `V{YYYYMMDDHHmm}__{snake_case_description}.sql`
- **Zero-downtime 원칙**: 컬럼 추가는 nullable → 백필 → NOT NULL 3단계
- `ALTER TABLE`에 `ALGORITHM=INPLACE, LOCK=NONE` 옵션 고려 (대용량 테이블)
- 롤백 스크립트(`U{...}.sql`) 병행 작성

### Testcontainers
- 이미지: `mysql:8.0` 고정 (8.4 LTS는 드라이버 호환성 확인 전까지 보류)
- 컨테이너 재사용: `.testcontainers.properties`에 `testcontainers.reuse.enable=true`
- 마이그레이션은 Flyway로 실행해 운영과 동일 경로 검증

### 커넥션 풀 (HikariCP)
- `maximum-pool-size`: 앱 인스턴스당 10 기본, 부하 테스트로 조정
- `connection-timeout`: 3초
- `leak-detection-threshold`: 10초 (개발·스테이징만)
- MySQL `wait_timeout`보다 `max-lifetime` 짧게 (기본 30분 → 25분)

### 운영
- 슬로우 쿼리 임계: 1초, `long_query_time=1`로 설정 후 주간 리뷰
- 스키마 덤프는 `mysqldump --single-transaction --no-data` 로 매일 백업
- 읽기 부하 분산은 Phase 2에서 리드 리플리카 + `@Transactional(readOnly=true)` 라우팅으로 도입
