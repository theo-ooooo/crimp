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
| MySQL host:port | `localhost:3306` |
| MySQL 관리자 | `root` / `root` |
| MySQL 앱 계정 | `crimp` / `crimp` |
| MySQL DB | `crimp` |
| Redis host:port | `localhost:6379` |

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
claude mcp add --transport stdio mysql \
  --env MYSQL_HOST=localhost \
  --env MYSQL_PORT=3306 \
  --env MYSQL_USER=crimp \
  --env MYSQL_PASSWORD=crimp \
  --env MYSQL_DATABASE=crimp \
  -- npx -y @benborla29/mcp-server-mysql

claude mcp list
```

`--scope project` 플래그로 `.mcp.json`에 저장하면 팀 전체가 공유 가능 (단, 커밋 전에 민감정보 환경 변수 참조로 돌려야 함).

## 스테이징·프로덕션

추후 Terraform(`infra/terraform/`) 으로 구성 예정:
- RDS MySQL 8 (Multi-AZ prod)
- ElastiCache Redis
- ECS Fargate
- S3 + CloudFront
- MediaConvert
