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
3. Settings → Public access → 일단 **Off** (presigned URL 만 사용).
4. R2 → "Manage R2 API Tokens" → "Create API token"
   - Permission: **Object Read & Write**
   - Bucket: `crimp-media-staging` 만 지정
   - 생성 후 **Access Key ID / Secret Access Key / S3 endpoint URL** 복사 (한 번만 표시됨).

> S3 endpoint URL 형태: `https://<account_id>.r2.cloudflarestorage.com`

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
  KAKAO_CLIENT_ID="<staging Kakao app key>" \
  KAKAO_REST_API_KEY="<staging Kakao REST key>" \
  KAKAO_CLIENT_SECRET="<staging Kakao client secret>" \
  APPLE_CLIENT_ID="<staging Apple bundle id>" \
  APPLE_SERVICE_ID="<staging Apple service id>" \
  APPLE_TEAM_ID="<Apple team id>" \
  APPLE_KEY_ID="<staging Apple key id>" \
  APPLE_PRIVATE_KEY_PEM="$(cat path/to/AuthKey_XXX.p8)"
```

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

1. Cloudflare Dashboard → 도메인 → DNS → "Add record"
   - Type: **CNAME**
   - Name: `staging-api` (예: `staging-api.crimp.example.com`)
   - Target: `crimp-api-staging.fly.dev`
   - Proxy: **Proxied (orange cloud)**
2. Fly 측 도메인 등록:
   ```bash
   flyctl certs create staging-api.crimp.example.com --app crimp-api-staging
   flyctl certs show   staging-api.crimp.example.com --app crimp-api-staging
   ```

## 8. CI 자동 배포 활성화

GitHub repo Settings → Secrets and variables → Actions → New repository secret:

- `FLY_API_TOKEN` — `flyctl auth token` 출력 또는 organization deploy token (권장).

이후 `develop` 브랜치 push (PR 머지 포함) 시 `.github/workflows/staging-deploy.yml`
이 자동으로 `flyctl deploy --remote-only` 실행.

## 9. 검증 체크리스트

- [ ] `GET /actuator/health` → 200
- [ ] `POST /api/v1/auth/oauth/kakao` 가 staging Kakao 키로 로그인 성공 (web 또는 모바일에서)
- [ ] R2 presigned PUT 으로 이미지 업로드 → 다운로드 가능
- [ ] Flyway 마이그레이션 적용 (`SHOW TABLES;`)
- [ ] Fly 머신 메모리 사용량 < 80% (`flyctl status`, JVM `-XX:MaxRAMPercentage=75` 정상 적용)

## 10. 트러블슈팅

| 증상 | 원인 / 처방 |
| --- | --- |
| API 부팅 실패 / `Communications link failure` | MySQL 미기동 — `flyctl status --app crimp-mysql-staging` 확인 / 볼륨 attach 여부 |
| `AUTH_COOKIE_SAME_SITE=None requires secure=true` | application-staging.yml 이 `secure: true` 명시 — 시크릿이 누락됐는지 (`AUTH_COOKIE_DOMAIN`) |
| R2 presigned PUT 403 | `S3_ENDPOINT_URL` / `path-style-access-enabled` 미적용. 토큰의 권한 (`Object Read & Write`) 확인 |
| OOM / 잦은 재시작 | `JAVA_OPTS` 의 `MaxRAMPercentage` 낮추거나 머신 메모리 ↑ (`flyctl scale memory 2048`) |

## 운영 (prod) 차이점 (요약)

- DB: **AWS RDS 또는 PlanetScale** (HA, 자동 백업) — self-host 사용 금지.
- Redis: **AWS ElastiCache** 또는 Upstash 유료 plan.
- R2 → **AWS S3 + CloudFront** (CLAUDE.md 명세 — 단, R2 유지 옵션 검토 가능).
- Fly Machine: shared-1x → `performance-2x`, 머신 2대 이상 (HA).
- 도메인: `api.crimp.app` (운영), `staging-api.crimp.app` (staging).
