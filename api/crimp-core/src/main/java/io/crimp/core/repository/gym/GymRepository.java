package io.crimp.core.repository.gym;

import io.crimp.core.entity.enums.GymStatus;
import io.crimp.core.entity.gym.Gym;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GymRepository extends JpaRepository<Gym, Long>, GymRepositoryCustom {

    Optional<Gym> findByExtId(String extId);

    Optional<Gym> findByExtIdAndStatus(String extId, GymStatus status);
}
