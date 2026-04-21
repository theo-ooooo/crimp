package io.crimp.core.repository.gym;

import io.crimp.core.entity.gym.Route;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RouteRepository extends JpaRepository<Route, Long> {
    Optional<Route> findByExtId(String extId);
    List<Route> findByGymIdAndRemovedAtIsNull(Long gymId);
}
