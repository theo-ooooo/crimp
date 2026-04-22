# infra

로컬 개발·스테이징·프로덕션 인프라 구성.

## 로컬 (Docker Compose)

프로젝트 루트의 `docker-compose.yml` 이 MySQL 8 + Redis 7 을 기동한다.

```bash
# 기동
docker compose up -d

# 상태 확인
docker compose ps

# 헬스 체크
docker exec crimp-mysql mysqladmin ping -uroot -proot
docker exec crimp-redis redis-cli ping

# 로그
docker compose logs -f mysql
docker compose logs -f redis

# 중단 (데이터 유지)
docker compose down

# 완전 초기화 (볼륨 삭제)
docker compose down -v
```

## 접속 정보 (로컬)

| 항목 | 값 |
| --- | --- |
| MySQL host:port | `localhost:13306` |
| MySQL 관리자 | `root` / `root` |
| MySQL 앱 계정 | `crimp` / `crimp` |
| MySQL DB | `crimp` |
| Redis host:port | `localhost:16379` |

> 포트 13306·16379 는 Homebrew 등 로컬 다른 MySQL/Redis 인스턴스(기본 3306/6379)와 충돌 방지.

## 구조

```
infra/
├── README.md
└── mysql/
    └── init/
        └── 00-grants.sql   # 컨테이너 최초 기동 시 1회 실행
```

## MySQL MCP 연결 (Claude Code)

로컬 개발 시 Claude가 DB를 직접 조회할 수 있게 MCP 서버를 등록하려면:

```bash
claude mcp add --scope user --transport stdio mysql \
  --env MYSQL_HOST=127.0.0.1 \
  --env MYSQL_PORT=13306 \
  --env MYSQL_USER=crimp \
  --env MYSQL_PASS=crimp \
  --env MYSQL_DB=crimp \
  -- npx -y @benborla29/mcp-server-mysql

claude mcp list
```

- `@benborla29/mcp-server-mysql` env 이름 규약: `MYSQL_PASS` / `MYSQL_DB` (축약형)
- `--scope project` 플래그로 `.mcp.json` 에 저장하면 팀 공유 가능 (커밋 전 민감정보 env 참조로 돌려야 함)
- 등록 후 Claude Code `/exit` → `claude --continue` 로 세션 재시작해야 도구 로드됨

## 스테이징·프로덕션

추후 Terraform(`infra/terraform/`) 으로 구성 예정:
- RDS MySQL 8 (Multi-AZ prod)
- ElastiCache Redis
- ECS Fargate
- S3 + CloudFront
- MediaConvert
