package io.crimp.domain.auth;

import io.crimp.core.entity.enums.OauthProvider;

public record OauthUserInfo(
        OauthProvider provider,
        String providerUid,
        String email
) {}
