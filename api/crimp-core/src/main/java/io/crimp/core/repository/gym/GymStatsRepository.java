package io.crimp.core.repository.gym;

import io.crimp.core.entity.gym.GymStats;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface GymStatsRepository extends JpaRepository<GymStats, Long>, GymStatsRepositoryCustom {

    List<GymStats> findByGymIdIn(Collection<Long> gymIds);
}
