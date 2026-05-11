package io.crimp.core.entity.user;

import io.crimp.core.entity.enums.OauthProvider;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Getter
@Table(name = "oauth_identities")
@NoArgsConstructor(access = PROTECTED)
public class OauthIdentity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 20)
    private OauthProvider provider;

    @Column(name = "provider_uid", nullable = false, length = 255)
    private String providerUid;

    @CreationTimestamp
    @Column(name = "linked_at", nullable = false, updatable = false)
    private Instant linkedAt;

    private OauthIdentity(Long userId, OauthProvider provider, String providerUid) {
        this.userId = userId;
        this.provider = provider;
        this.providerUid = providerUid;
    }

    public static OauthIdentity link(Long userId, OauthProvider provider, String providerUid) {
        return new OauthIdentity(userId, provider, providerUid);
    }

    public void relinkTo(Long userId) {
        this.userId = userId;
    }
}
