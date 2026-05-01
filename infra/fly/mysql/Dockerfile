# MySQL 8 self-hosted on Fly.io — Crimp staging DB.
#
# 공식 mysql:8 이미지를 그대로 쓰고 init SQL 만 추가. Fly Machine 의 persistent
# volume (/var/lib/mysql) 에 데이터가 저장된다. 운영 (prod) 은 매니지드 DB 권장 —
# 본 self-host 는 staging 한정.
#
# 빌드: docker build -t crimp-mysql:staging infra/fly/mysql/
# 배포: cd infra/fly/mysql && flyctl deploy --remote-only

FROM mysql:8.0

# 컨테이너 최초 기동 시 1회 실행되는 init SQL.
# infra/mysql/init/00-grants.sql 와 동일한 권한 셋업 — 로컬/staging 일관성.
COPY init/ /docker-entrypoint-initdb.d/

# Fly volume mount point 와 mysql 기본 데이터 경로 일치.
VOLUME ["/var/lib/mysql"]

EXPOSE 3306

# mysql:8 의 기본 ENTRYPOINT 그대로 — Fly secrets 로 다음 ENV 주입:
#   MYSQL_ROOT_PASSWORD, MYSQL_DATABASE=crimp, MYSQL_USER=crimp, MYSQL_PASSWORD=<...>
