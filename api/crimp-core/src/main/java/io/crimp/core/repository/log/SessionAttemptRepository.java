package io.crimp.core.repository.log;

import io.crimp.core.entity.log.SessionAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SessionAttemptRepository extends JpaRepository<SessionAttempt, Long>,
        SessionAttemptRepositoryCustom {
    Optional<SessionAttempt> findByExtId(String extId);
    List<SessionAttempt> findBySessionIdOrderByLoggedAt(Long sessionId);
}
