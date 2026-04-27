package io.crimp.domain.auth;

import io.crimp.core.entity.enums.OauthProvider;

/**
 * provider 의 authorization_code 를 id_token 으로 교환하는 외부 호출 포트.
 *
 * <p>웹 v2 redirect flow 에서 브라우저는 인가 결과로 1회용 code 만 받는다.
 * AuthService 는 이 포트를 통해 provider 의 token endpoint 와 통신해 id_token 을
 * 얻고, 이후 기존 {@link OauthIdTokenVerifier} 로 검증해 동일한 사용자 매칭/JWT
 * 발급 흐름에 합류한다.
 *
 * <p>구현체는 infra 모듈에 둔다 (domain → infra 의존 금지). 미구현 provider 는
 * 서비스에서 {@link AuthException} {@code AUTH_PROVIDER_UNSUPPORTED} 로 처리한다.
 */
public interface OauthCodeExchanger {

    /** 이 구현체가 담당하는 provider. */
    OauthProvider supports();

    /**
     * provider 환경 변수(REST API key 등) 가 모두 설정되어 호출 가능한 상태인지.
     * 미설정인 경우 호출부에서 {@code KAKAO_OAUTH_NOT_CONFIGURED} 와 같은 명시 응답
     * 으로 차단해 500 대신 친절한 503 / 503 envelope 을 반환한다.
     */
    boolean isConfigured();

    /**
     * code → id_token 교환.
     *
     * @param code        provider 가 redirect_uri 로 발급한 1회용 code
     * @param redirectUri 인가 단계에서 사용한 redirect_uri (provider 가 정확히 동일한 값을 요구)
     * @return id_token (OIDC) — 호출부가 {@link OauthIdTokenVerifier} 로 추가 검증한다
     * @throws RuntimeException provider 호출 실패 (4xx · 네트워크 · 응답 누락 등)
     */
    String exchange(String code, String redirectUri);
}
