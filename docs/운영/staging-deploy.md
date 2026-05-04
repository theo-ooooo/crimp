# Staging 배포 런북 — Fly.io + Cloudflare R2 + Upstash Redis

이 문서는 Crimp 백엔드 staging 환경을 처음 셋업하는 1회성 절차를 정리한다. 일상 배포는
`develop` 브랜치 push 시 자동 (`.github/workflows/staging-deploy.yml`).

## 아키텍처 한눈에

```
┌──────────────────────┐       ┌──────────────────────┐
│  Cloudflare DNS/CDN  │  →    │   crimp-api-staging  │  (Fly.io NRT, 1 vCPU/1GB)
│   staging.crimp.app  │       │   Spring Boot 3      │
└──────────────────────┘       └──────────┬───────────┘
                                          │ 6PN internal
                              ┌───────────┼───────────┐
                              ▼                       ▼
                    crimp-mysql-staging       Upstash Redis
                    (Fly.io NRT, 1GB vol)    (외부, TLS)
                              │
                              ▼
                       Cloudflare R2 (S3-compat)
                       (미디어 업로드)
```

비용 (월 추정): **Fly API + MySQL ~$6** + **Upstash free** + **R2 free** = **약 $6~10/mo**.

## 사전 준비

### 0-1. flyctl 설치

macOS:
```bash
brew install flyctl       # Homebrew 권장
flyctl version            # 설치 확인 — "flyctl v0.x.x ..." 출력
```

Homebrew 미사용 / Linux:
```bash
curl -L https://fly.io/install.sh | sh
echo 'export FLYCTL_INSTALL="$HOME/.fly"' >> ~/.zshrc
echo 'export PATH="$FLYCTL_INSTALL/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
flyctl version
```

> Apple Silicon + 새 Homebrew 환경에서 `command not found: flyctl` 이 뜨면 `/opt/homebrew/bin` 이 PATH 에 없어서일 가능성 ↑. `eval "$(/opt/homebrew/bin/brew shellenv)"` 또는 `~/.zshrc` 에 brew shellenv 추가.

### 0-2. 계정 / 외부 서비스

- **Fly.io** — `flyctl auth signup` (또는 `auth login`). 무료 tier 에도 결제수단(카드) 등록 필요 (2024+ 정책).
- **Upstash** (https://upstash.com) — GitHub OAuth 로 가입. Redis free tier 등록.
- **Cloudflare** — R2 사용. 도메인 없어도 R2 단독 사용 가능 (presigned URL 만 쓰면 충분).

### 0-3. 검증

```bash
flyctl auth whoami        # 이메일 출력 확인
flyctl orgs list          # organization slug 메모 (예: "personal")
```

## 1. Fly 로그인

```bash
flyctl auth login
flyctl orgs list   # organization slug 확인 (예: "personal")
```

## 2. MySQL 앱 생성

```bash
cd infra/fly/mysql

flyctl apps create crimp-mysql-staging --org <org-slug>

# 1GB 볼륨 — 더 키우려면 --size 5 등으로 조정.
flyctl volumes create crimp_mysql_data \
  --app crimp-mysql-staging \
  --region nrt \
  --size 1

# 시크릿 — root / crimp 유저 패스워드는 충분히 강력하게 (예: openssl rand -base64 32).
flyctl secrets set --app crimp-mysql-staging \
  MYSQL_ROOT_PASSWORD="$(openssl rand -base64 32)" \
  MYSQL_DATABASE=crimp \
  MYSQL_USER=crimp \
  MYSQL_PASSWORD="$(openssl rand -base64 32)"

# 배포.
flyctl deploy --remote-only

# crimp 유저 패스워드는 다음 단계에서 API 시크릿으로 다시 사용하므로 별도 보관.
flyctl secrets list --app crimp-mysql-staging
```

> 확인: `flyctl machine list --app crimp-mysql-staging` 에 `started` 머신이 1대.

## 3. Upstash Redis 생성

1. https://console.upstash.com → "Create Database"
2. Region: **AP-Northeast-1 (Tokyo)** — Fly NRT 와 같은 지역.
3. TLS: **Enabled** (필수).
4. Free tier 선택.
5. 생성 후 "Endpoint" 의 host/port/password 복사.

## 4. Cloudflare R2 버킷 + API 토큰

1. Cloudflare Dashboard → R2 → "Create bucket"
2. 이름: `crimp-media-staging` (전역 unique).
3. R2 → "Manage R2 API Tokens" → "Create API token"
   - Permission: **Object Read & Write**
   - Bucket: `crimp-media-staging` 만 지정
   - 생성 후 **Access Key ID / Secret Access Key / S3 endpoint URL** 복사 (한 번만 표시됨).

> S3 endpoint URL 형태: `https://<account_id>.r2.cloudflarestorage.com`

### 4-bis. CDN (피드 미디어 GET) 활성화 — PR-F4

업로드 (PUT) 는 presigned URL 로 인증된 호출만 받지만, 피드의 이미지/비디오 **GET** 은
공개 캐시된 URL 이 필요. 두 가지 path 중 staging 은 (A) 가 가장 간단:

**Path A — R2 public bucket URL (CDN 자동 적용, 가장 간단)**

> R2 콘솔 UI 라벨은 종종 변경됨 — 공식 문서 (https://developers.cloudflare.com/r2/buckets/public-buckets/) 기준 진행 권장.

1. 버킷 → Settings → "Public Access" 섹션 → "R2.dev subdomain" 옆 토글 또는 "Allow access" 클릭. 약관 동의 단계 ("I confirm" 류) 가 표시되면 진행.
2. 활성화 후 `https://pub-<account_hash>.r2.dev` 형태의 URL 이 표시됨.
3. 백엔드 시크릿 (`CDN_BASE_URL`) 으로 주입 (다음 §5):
   ```
   CDN_BASE_URL=https://pub-<account_hash>.r2.dev
   ```
4. Cloudflare edge 가 자동 캐시 (default TTL 수 시간) — CDN 별도 설정 불필요.
   - 이미지/비디오 GET 은 CORS preflight 불필요 (simple GET). 비디오 `Range` request 도 R2 가 정상 처리.
   - **주의**: 동일 `s3Key` 로 콘텐츠를 교체하면 stale 응답이 나옴. 우리 키 규약은 ULID 기반 write-once 라 일반적으로 안전, 강제 갱신 필요 시 cache purge.

> 단점:
> - URL 에 account hash 노출 (staging 무방, prod 는 Path B 권장).
> - **버킷의 모든 객체가 키만 알면 GET 가능**. ULID 라 추측 사실상 불가하지만, 민감 자료 (인증서, dump 등) 를 같은 버킷에 두지 말 것.
> - Cloudflare 의 `r2.dev` subdomain 은 free-tier rate limit 이 걸려 있어 운영급 트래픽엔 부적합 — prod 는 Path B.

**Path B — Cloudflare Custom Domain (브랜딩, prod 권장)**
1. 버킷 → Settings → "Custom Domains" → "Connect Domain".
2. 도메인: `media-staging.crimp.run` (또는 원하는 sub).
3. R2 가 DNS 레코드 자동 생성 + Cloudflare Universal SSL cert 자동 발급 (도메인이 Cloudflare 에 위임돼 있어야 함).
   - **cert 발급에 수 분~수 시간 소요** (특히 신규 zone). status 가 `Active` 로 바뀐 뒤 다음 단계.
4. 백엔드 시크릿:
   ```
   CDN_BASE_URL=https://media-staging.crimp.run
   ```
5. Cloudflare → 도메인 → Caching / Page Rules 에서 캐시 규칙 조정 가능. WAF / Bot Fight Mode 도 zone 단위로 적용 가능.

> 둘 중 하나 선택 후 다음 §5 의 `S3_ENDPOINT_URL`/`S3_ACCESS_KEY` 등과 함께 `CDN_BASE_URL` 도 같이 주입.

## 5. API 앱 생성 + 시크릿 주입

```bash
cd api

# 같은 organization 에 — internal 6PN 으로 MySQL 통신 가능해야 함.
flyctl apps create crimp-api-staging --org <org-slug>

# JWT 시크릿 — 32 bytes+ 무작위.
JWT_SECRET="$(openssl rand -base64 48)"

# OAuth — 운영 키는 docs/설계/auth.md 참조 (Kakao 콘솔 / Apple Developer).
# 모든 KAKAO_/APPLE_ 값은 staging 전용으로 발급한 별도 키 권장 (운영 키 노출 방지).

flyctl secrets set --app crimp-api-staging \
  DB_PASSWORD="<step 2 의 MYSQL_PASSWORD>" \
  REDIS_HOST="<step 3 의 Upstash host>" \
  REDIS_PORT="<step 3 의 Upstash port>" \
  REDIS_PASSWORD="<step 3 의 Upstash password>" \
  JWT_SECRET="$JWT_SECRET" \
  AUTH_COOKIE_DOMAIN=".crimp-staging.example.com" \
  AUTH_COOKIE_SAME_SITE="None" \
  CORS_ALLOWED_ORIGINS="https://staging.crimp.example.com" \
  S3_BUCKET="crimp-media-staging" \
  S3_ACCESS_KEY="<R2 Access Key ID>" \
  S3_SECRET_KEY="<R2 Secret Access Key>" \
  S3_ENDPOINT_URL="https://<account_id>.r2.cloudflarestorage.com" \
  CDN_BASE_URL="https://pub-<account_hash>.r2.dev" \
  KAKAO_NATIVE_CLIENT_ID="<staging Kakao native app key>" \
  KAKAO_WEB_CLIENT_ID="<staging Kakao JavaScript key>" \
  KAKAO_REST_API_KEY="<staging Kakao REST key>" \
  KAKAO_CLIENT_SECRET="<staging Kakao client secret>" \
  APPLE_CLIENT_ID="<staging Apple bundle id>" \
  APPLE_SERVICE_ID="<staging Apple service id>" \
  APPLE_TEAM_ID="<Apple team id>" \
  APPLE_KEY_ID="<staging Apple key id>" \
  APPLE_PRIVATE_KEY_PEM="$(cat path/to/AuthKey_XXX.p8)"
```

> ⚠️ (PR #114 리뷰 I5) `$(cat ...)` 는 파일이 없어도 stderr 만 내고 빈 문자열을 set 한다 →
> API 부팅은 성공하지만 Apple OAuth 가 런타임 503. 다음 가드를 명령 직전에:
> ```bash
> APPLE_KEY_FILE="$HOME/Downloads/AuthKey_XXXXXXXXXX.p8"
> [[ -f "$APPLE_KEY_FILE" ]] || { echo "missing p8: $APPLE_KEY_FILE" >&2; return 1; }
> ```
> 또는 .p8 내용을 직접 인라인 문자열로 (`APPLE_PRIVATE_KEY_PEM='-----BEGIN PRIVATE KEY-----\n...'`)
> 넣어도 OK — 파일 경로가 자주 바뀌는 환경에서 더 안정.

> ⚠️ `AUTH_COOKIE_SAME_SITE=None` 은 cross-site (`web` 도메인 ↔ `api` 도메인 다른 경우)
> 시 필요. 같은 sub-domain 운영이면 `Lax` 로. `None` 인데 `secure=true` 가 아니면 부팅 실패.

## 6. 첫 배포

```bash
cd api
flyctl deploy --remote-only
flyctl logs --app crimp-api-staging   # 부팅 로그 확인
flyctl status --app crimp-api-staging
```

> 부팅 후 `https://crimp-api-staging.fly.dev/actuator/health` 가 `200 {"status":"UP"}`.

## 7. Cloudflare DNS + 커스텀 도메인 (선택)

> (PR #114 리뷰 I7) **선행 조건**: 도메인이 **Cloudflare DNS (네임서버) 로 위임 완료** 되어
> 있어야 함. 다른 레지스트라 (GoDaddy 등) 에서 새로 산 직후라면 Cloudflare 로의 DNS 이전이
> 끝날 때까지 (보통 수 분~24시간) 본 단계는 실패한다. `dig NS crimp.example.com` 으로
> nameserver 가 `*.ns.cloudflare.com` 인지 먼저 확인.

1. Cloudflare Dashboard → 도메인 → DNS → "Add record"
   - Type: **CNAME**
   - Name: `staging-api` (예: `staging-api.crimp.example.com`)
   - Target: `crimp-api-staging.fly.dev`
   - Proxy: **DNS only (회색 구름)** — staging 단계 권장. 프록시 (오렌지) 켜려면 SSL/TLS
     mode 를 "Full" 이상으로 두고 Fly cert 도 별도 유지.
2. Fly 측 도메인 등록:
   ```bash
   flyctl certs create staging-api.crimp.example.com --app crimp-api-staging
   flyctl certs show   staging-api.crimp.example.com --app crimp-api-staging
   ```

## 8. CI 자동 배포 활성화

(PR #114 리뷰 I1) **앱-스코프 deploy 토큰 사용을 강력 권장.** personal 토큰
(`flyctl auth token`) 은 organization 전체에 write 가능해 GitHub Secrets 노출 시
다른 앱까지 위험.

```bash
# 권장: crimp-api-staging 만 deploy 가능, 1년 만료.
flyctl tokens create deploy --app crimp-api-staging --expiry 8760h
# 출력 끝의 'FlyV1 fm2_xxx...' 한 줄 통째로 복사.
```

GitHub repo Settings → Secrets and variables → Actions → **New repository secret**:
- Name: `FLY_API_TOKEN`
- Secret: 위에서 복사한 토큰 통째로

이후 `develop` push (PR 머지 포함) → `ci.yml` 그린 → `staging-deploy.yml` 이
`workflow_run` 으로 체이닝되어 자동 `flyctl deploy --remote-only` 실행.

> 게이팅 흐름: `ci.yml` (gradle check) 실패 시 staging 배포 차단. 수동 강제 배포가
> 필요하면 Actions UI 의 "Run workflow" 또는 `gh workflow run staging-deploy.yml`.

> Fallback (권장 X): organization 전체 권한 토큰이 필요하면 `flyctl auth token`. 보안 리스크
> 인지하고 사용. 정기 회전(90일) 필수.

### 8-bis. DB (MySQL) 변경 시 수동 재배포

(PR #114 리뷰 I4) `staging-deploy.yml` 의 `paths` 필터는 `api/**` 만 포함하므로
`infra/fly/mysql/**` (예: init SQL 추가, MySQL 메이저 버전 업) 변경은 자동 배포되지
않는다. 다음 명령으로 수동 재배포:

```bash
cd infra/fly/mysql
flyctl deploy --remote-only --app crimp-mysql-staging
```

> ⚠️ DB 재배포는 짧은 다운타임 동반 (`strategy = immediate`). 트래픽 적은 시간대 권장.

## 9. 검증 체크리스트

- [ ] `GET /actuator/health` → 200
- [ ] Kakao 로그인 성공: 모바일은 `KAKAO_NATIVE_CLIENT_ID`, 웹은 `KAKAO_WEB_CLIENT_ID`,
  code 교환은 `KAKAO_REST_API_KEY`/`KAKAO_CLIENT_SECRET` 값이 staging 앱 설정과 일치해야 함
- [ ] R2 presigned PUT 으로 이미지 업로드 → 다운로드 가능
- [ ] Flyway 마이그레이션 적용 (`SHOW TABLES;`)
- [ ] Fly 머신 메모리 사용량 < 80% (`flyctl status`, JVM `-XX:MaxRAMPercentage=75` 정상 적용)

## 10. 트러블슈팅

| 증상 | 원인 / 처방 |
| --- | --- |
| API 부팅 실패 / `Communications link failure` | MySQL 미기동 — `flyctl status --app crimp-mysql-staging` 확인 / 볼륨 attach 여부 |
| 첫 요청 5~15s 지연 (이후 정상) | (PR #114 리뷰 I6) **cold-start — 정상 동작.** `min_machines_running=0` + `auto_stop_machines=stop` 으로 idle 머신 정지 → JVM warm-up + DataSource init + Flyway validate 시간. 항상 켜두려면 `flyctl scale count 1 --app crimp-api-staging` + `auto_stop=false` |
| `AUTH_COOKIE_SAME_SITE=None requires secure=true` | application-staging.yml 이 `secure: true` 명시 — 시크릿이 누락됐는지 (`AUTH_COOKIE_DOMAIN`) |
| R2 presigned PUT 403 | `S3_ENDPOINT_URL` / `path-style-access-enabled` 미적용. 토큰의 권한 (`Object Read & Write`) 확인 |
| CDN URL GET 403/404 | (PR-F4) Path A: 버킷 Public access OFF 또는 R2.dev subdomain 미활성. Path B: cert 미발급 (수 분 대기) 또는 Custom Domain status=`Pending`. 둘 다 아니면 `s3Key` prefix 가 실제 객체 key 와 다르거나 `CDN_BASE_URL` 호스트 오타 (`pub-` 누락 등) 가능 |
| OOM / 잦은 재시작 | `JAVA_OPTS` 의 `MaxRAMPercentage` 낮추거나 머신 메모리 ↑ (`flyctl scale memory 2048`) |
| `Public Key Retrieval is not allowed` (첫 부팅) | JDBC URL 에 `allowPublicKeyRetrieval=true` 누락. `application-staging.yml` 의 `DB_URL` default 가 이 옵션 포함 — 환경변수로 override 시 함께 박아야 함 |

## 운영 (prod) 차이점 (요약)

- DB: **AWS RDS 또는 PlanetScale** (HA, 자동 백업) — self-host 사용 금지.
- Redis: **AWS ElastiCache** 또는 Upstash 유료 plan.
- R2 → **AWS S3 + CloudFront** (CLAUDE.md 명세 — 단, R2 유지 옵션 검토 가능).
- Fly Machine: shared-1x → `performance-2x`, 머신 2대 이상 (HA).
- 도메인: `api.crimp.app` (운영), `staging-api.crimp.app` (staging).
