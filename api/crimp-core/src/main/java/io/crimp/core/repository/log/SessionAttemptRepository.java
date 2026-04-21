package io.crimp.core.repository.log;

import io.crimp.core.entity.log.SessionAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SessionAttemptRepository extends JpaRepository<SessionAttempt, Long> {
    List<SessionAttempt> findBySessionIdOrderByLoggedAt(Long sessionId);
}
