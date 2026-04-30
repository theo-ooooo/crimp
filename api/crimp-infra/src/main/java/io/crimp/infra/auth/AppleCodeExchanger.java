package io.crimp.infra.auth;

import io.crimp.core.entity.enums.OauthProvider;
import io.crimp.domain.auth.OauthCodeExchanger;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Apple authorization_code → id_token 교환 어댑터 (PR #106, PR-W2).
 *
 * <p>도메인 포트 {@link OauthCodeExchanger} 를 구현하고 실제 HTTP 통신은
 * {@link AppleOAuthClient} 로 위임. Apple 의 client_secret JWT 생성 책임은
 * {@link AppleClientSecretGenerator} 가 담당하며 본 어댑터는 흐름만 연결.
 *
 * <p>웹 v2 redirect flow 만 사용 — 모바일은 PR #104 의 native ID Token 직접 교환을 쓴다.
 */
@Component
@Profile("!test")
public class AppleCodeExchanger implements OauthCodeExchanger {

    private final AppleOAuthClient client;
    private final AppleProperties props;

    public AppleCodeExchanger(AppleOAuthClient client, AppleProperties props) {
        this.client = client;
        this.props = props;
    }

    @Override
    public OauthProvider supports() {
        return OauthProvider.APPLE;
    }

    @Override
    public boolean isConfigured() {
        return props.isCodeExchangeEnabled();
    }

    @Override
    public String exchange(String code, String redirectUri) {
        return client.exchangeCode(code, redirectUri).idToken();
    }
}
