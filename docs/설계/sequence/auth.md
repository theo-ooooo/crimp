# 소셜 로그인 시퀀스

| 항목 | 내용 |
| --- | --- |
| 작성일 | 2026-04-17 |
| 상태 | Draft |
| 지원 Provider | Kakao / Apple / Google |

## 1. 정상 플로우 (최초 로그인)

```mermaid
sequenceDiagram
    autonumber
    actor User as 사용자
    participant App as 모바일 앱
    participant Provider as OAuth Provider
    participant API as Spring Boot API
    participant Redis as Redis
    participant DB as MySQL

    User->>App: "카카오로 시작하기" 탭
    App->>Provider: OAuth 동의 화면 요청
    Provider-->>User: 동의 화면 노출
    User->>Provider: 동의 및 로그인
    Provider-->>App: Authorization Code (또는 ID Token)
    App->>API: POST /v1/auth/oauth/kakao { idToken }
    API->>Provider: (필요 시) idToken 검증 또는 code 교환
    Provider-->>API: userInfo (provider_uid, email)
    API->>DB: SELECT * FROM oauth_identities WHERE provider, provider_uid
    alt 기존 사용자
        DB-->>API: user_id
    else 최초 로그인
        API->>DB: INSERT users, profiles, oauth_identities (트랜잭션)
        DB-->>API: user_id
    end
    API->>API: JWT Access(15m), Refresh(14d) 발급
    API->>Redis: SET refresh:{userId}:{jti} {hash} EX 14d
    API-->>App: { accessToken, refreshToken, user }
    App->>App: Keychain/Keystore에 저장
    App-->>User: 홈 피드 진입
```

## 2. 액세스 토큰 재발급

```mermaid
sequenceDiagram
    autonumber
    participant App
    participant API
    participant Redis

    App->>API: POST /v1/auth/refresh { refreshToken }
    API->>API: refreshToken 서명·만료 검증
    API->>Redis: GET refresh:{userId}:{jti}
    alt 유효
        Redis-->>API: hash
        API->>API: new Access, new Refresh (회전)
        API->>Redis: DEL old jti, SET new jti
        API-->>App: { accessToken, refreshToken }
    else 무효/재사용
        API-->>App: 401 AUTH_INVALID
        API->>Redis: 해당 userId 전체 refresh 무효화 (보안)
    end
```

## 3. 로그아웃

```mermaid
sequenceDiagram
    participant App
    participant API
    participant Redis

    App->>API: POST /v1/auth/logout { refreshToken }
    API->>Redis: DEL refresh:{userId}:{jti}
    API-->>App: 200
    App->>App: 로컬 토큰 제거
```

## 4. 예외·엣지

| 케이스 | 처리 |
| --- | --- |
| Provider idToken 검증 실패 | 401 `AUTH_INVALID` |
| 네트워크 타임아웃 | 503 `DEPENDENCY_UNAVAILABLE` (Provider) |
| 탈퇴 상태 사용자 복구 | `users.status=9(DELETED)` 30일 이내면 복구 옵션 제시 |
| 이메일 중복(타 provider) | 동일 email_hash 있으면 연결 제안 화면 (Phase 1.5) |
| Apple 첫 로그인만 email 제공 | 최초 로그인 시 email 저장, 이후 Apple은 email 미제공 허용 |

## 5. 보안 고려

- idToken 서명 검증: JWKS 캐싱(1시간), `kid` 매핑
- `aud`는 앱 ClientID, `iss`는 provider 고정값 화이트리스트
- Refresh 회전 시 이전 토큰을 그레이스 없이 즉시 만료
- 감사 로그: 로그인 성공·실패, 이상 IP(지리적 점프) 플래그
