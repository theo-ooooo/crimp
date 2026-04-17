package io.crimp.core.repository.user;

import io.crimp.core.entity.enums.OauthProvider;
import io.crimp.core.entity.user.OauthIdentity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OauthIdentityRepository extends JpaRepository<OauthIdentity, Long> {
    Optional<OauthIdentity> findByProviderAndProviderUid(OauthProvider provider, String providerUid);
}
