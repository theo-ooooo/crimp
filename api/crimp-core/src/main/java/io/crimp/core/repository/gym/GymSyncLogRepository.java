package io.crimp.core.repository.gym;

import io.crimp.core.entity.gym.GymSyncLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GymSyncLogRepository extends JpaRepository<GymSyncLog, Long> {
}
