package io.crimp.core.repository.crew;

import io.crimp.core.entity.crew.Crew;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CrewRepository extends JpaRepository<Crew, Long>, CrewRepositoryCustom {
    Optional<Crew> findByExtId(String extId);
}
