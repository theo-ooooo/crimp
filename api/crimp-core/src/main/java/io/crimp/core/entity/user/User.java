package io.crimp.core.entity.user;

import io.crimp.core.base.SoftDeletableEntity;
import io.crimp.core.entity.enums.UserStatus;
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

import java.time.Instant;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Getter
@Table(name = "users")
@NoArgsConstructor(access = PROTECTED)
public class User extends SoftDeletableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ext_id", nullable = false, length = 26, unique = true, updatable = false)
    private String extId;

    @Column(name = "email")
    private byte[] email;

    @Column(name = "email_hash", length = 64)
    private String emailHash;

    @Column(name = "status", nullable = false)
    private UserStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private io.crimp.core.entity.enums.UserRole role;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    private User(String extId, String emailHash, byte[] email, io.crimp.core.entity.enums.UserRole role) {
        this.extId = extId;
        this.emailHash = emailHash;
        this.email = email;
        this.status = UserStatus.ACTIVE;
        this.role = role;
    }

    public static User create(String extId, String emailHash, byte[] email) {
        return new User(extId, emailHash, email, io.crimp.core.entity.enums.UserRole.USER);
    }

    public void markLoggedIn() {
        this.lastLoginAt = Instant.now();
    }
}
