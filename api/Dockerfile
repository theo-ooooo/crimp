# syntax=docker/dockerfile:1.7
#
# Crimp API — Spring Boot 3 (Java 21) Docker 이미지.
# multi-stage: gradle build → JRE 21 슬림 런타임. Fly.io 의 NRT region 에 배포.
#
# 빌드:   docker build -t crimp-api:staging api/
# 실행:   docker run -p 8080:8080 -e SPRING_PROFILES_ACTIVE=staging crimp-api:staging

FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace

# 소스 한 번에 복사 + bootJar 빌드.
# (layered cache 최적화는 Phase 2 — 일단 안정적인 단일 빌드 컨텍스트로.)
COPY . .

# bootJar 만 필요 — 테스트는 CI 에서 별도 단계로 분리.
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew --no-daemon :crimp-api:bootJar -x test

# ─────────────────────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

# 비루트 유저로 실행 — distroless 가 가장 안전하지만 디버깅 편의를 위해 jre 유지.
# UID 1000 명시 안 함 — eclipse-temurin:21-jre 의 Ubuntu 베이스에 이미 UID 1000 (ubuntu 유저)
# 점유돼 useradd 가 exit 4 ("UID not unique") 로 실패. system uid 자동 할당.
RUN groupadd --system app && useradd --system --gid app --no-create-home app

COPY --from=build --chown=app:app /workspace/crimp-api/build/libs/crimp-api-*.jar /app/app.jar

USER app

# Fly Machine RAM 자동 인지 + G1GC.
# -XX:+ExitOnOutOfMemoryError — OOM 시 컨테이너 빠르게 종료해 Fly 의 헬스 재시작에 의존.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"

EXPOSE 8080
ENTRYPOINT ["sh","-c","exec java $JAVA_OPTS -jar /app/app.jar"]
