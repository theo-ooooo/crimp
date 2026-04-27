package io.crimp.infra.auth;

import io.crimp.core.entity.enums.OauthProvider;
import io.crimp.domain.auth.OauthCodeExchanger;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Kakao authorization_code → id_token 교환 어댑터.
 *
 * <p>도메인 포트 {@link OauthCodeExchanger} 를 구현하고, 실제 HTTP 통신은
 * {@link KakaoOAuthClient} 로 위임한다. {@code @Profile("!test")} 가 붙어
 * 단위 테스트는 적용되지 않으며, 통합 테스트에서만 빈으로 등록된다.
 */
@Component
@Profile("!test")
public class KakaoCodeExchanger implements OauthCodeExchanger {

    private final KakaoOAuthClient client;
    private final KakaoProperties props;

    public KakaoCodeExchanger(KakaoOAuthClient client, KakaoProperties props) {
        this.client = client;
        this.props = props;
    }

    @Override
    public OauthProvider supports() {
        return OauthProvider.KAKAO;
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
