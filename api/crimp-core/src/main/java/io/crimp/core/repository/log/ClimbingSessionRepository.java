package io.crimp.core.repository.log;

import io.crimp.core.entity.log.ClimbingSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ClimbingSessionRepository
        extends JpaRepository<ClimbingSession, Long>, ClimbingSessionRepositoryCustom {

    Optional<ClimbingSession> findByExtId(String extId);
}
