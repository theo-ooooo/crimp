package io.crimp.domain.gym;

import io.crimp.core.entity.enums.GymStatus;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.repository.gym.GymRepository;
import io.crimp.core.repository.log.GymRecentActivityRow;
import io.crimp.core.repository.log.SessionAttemptRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Profile("!test")
public class GymRecentActivityService {

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 50;

    private final GymRepository gymRepository;
    private final SessionAttemptRepository attemptRepository;

    public GymRecentActivityService(GymRepository gymRepository,
                                    SessionAttemptRepository attemptRepository) {
        this.gymRepository = gymRepository;
        this.attemptRepository = attemptRepository;
    }

    @Transactional(readOnly = true)
    public List<GymRecentActivityView> list(String gymExtId, Integer size) {
        Gym gym = gymRepository.findByExtIdAndStatus(gymExtId, GymStatus.ACTIVE)
                .orElseThrow(() -> new GymException("GYM_NOT_FOUND", "Gym " + gymExtId + " not found"));
        int pageSize = capSize(size);
        return attemptRepository.findRecentActivityByGymId(gym.getId(), pageSize).stream()
                .map(GymRecentActivityService::toView)
                .toList();
    }

    static int avatarColorHue(long userId) {
        long hue = ((userId * 70L) + 180L) % 360L;
        if (hue < 0) hue += 360L;
        return (int) hue;
    }

    private static int capSize(Integer size) {
        if (size == null || size <= 0) return DEFAULT_PAGE_SIZE;
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private static GymRecentActivityView toView(GymRecentActivityRow row) {
        return new GymRecentActivityView(
                row.userExtId(),
                row.nickname(),
                avatarColorHue(row.userId()),
                row.gradeValue(),
                row.result(),
                row.loggedAt()
        );
    }
}
