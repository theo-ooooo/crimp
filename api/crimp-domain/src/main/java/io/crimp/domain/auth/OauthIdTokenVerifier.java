package io.crimp.domain.auth;

import io.crimp.core.entity.enums.OauthProvider;

public interface OauthIdTokenVerifier {
    OauthProvider supports();
    OauthUserInfo verify(String idToken);
}
