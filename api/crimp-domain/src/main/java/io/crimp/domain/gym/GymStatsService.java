package io.crimp.domain.gym;

import io.crimp.core.entity.enums.AttemptResult;
import io.crimp.core.entity.enums.GymStatus;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.entity.gym.GymStats;
import io.crimp.core.repository.gym.GymRepository;
import io.crimp.core.repository.gym.GymStatsCountRow;
import io.crimp.core.repository.gym.GymStatsRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Profile("!test")
public class GymStatsService {

    private static final List<AttemptResult> SEND_RESULTS =
            List.of(AttemptResult.SEND, AttemptResult.FLASH, AttemptResult.ONSIGHT);

    private final GymRepository gymRepository;
    private final GymStatsRepository gymStatsRepository;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public GymStatsService(GymRepository gymRepository, GymStatsRepository gymStatsRepository) {
        this(gymRepository, gymStatsRepository, Clock.systemUTC());
    }

    public GymStatsService(GymRepository gymRepository, GymStatsRepository gymStatsRepository, Clock clock) {
        this.gymRepository = gymRepository;
        this.gymStatsRepository = gymStatsRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Map<Long, GymStatsSnapshot> loadByGymIds(Collection<Long> gymIds) {
        if (gymIds == null || gymIds.isEmpty()) {
            return Map.of();
        }
        return gymStatsRepository.findByGymIdIn(gymIds).stream()
                .collect(Collectors.toMap(
                        GymStats::getGymId,
                        s -> new GymStatsSnapshot(
                                s.getRating(),
                                nullToZero(s.getSendCount()),
                                nullToZero(s.getMonthlyUserCount()))));
    }

    @Transactional
    public void refreshAll() {
        List<Gym> gyms = gymRepository.findAllByStatus(GymStatus.ACTIVE);
        if (gyms.isEmpty()) {
            return;
        }

        Set<Long> gymIds = gyms.stream().map(Gym::getId).collect(Collectors.toSet());
        Map<Long, GymStats> existing = gymStatsRepository.findByGymIdIn(gymIds).stream()
                .collect(Collectors.toMap(GymStats::getGymId, Function.identity()));
        Map<Long, Long> sendCounts = gymStatsRepository.countSendsByGymId(SEND_RESULTS).stream()
                .collect(Collectors.toMap(GymStatsCountRow::gymId, row -> nullToZero(row.count())));
        Instant monthFrom = Instant.now(clock).minusSeconds(30L * 24L * 60L * 60L);
        Map<Long, Long> monthlyUserCounts = gymStatsRepository.countMonthlyUsersByGymId(monthFrom).stream()
                .collect(Collectors.toMap(GymStatsCountRow::gymId, row -> nullToZero(row.count())));

        List<GymStats> rows = gyms.stream()
                .map(gym -> {
                    GymStats stats = existing.getOrDefault(gym.getId(), GymStats.create(gym.getId()));
                    stats.update(
                            stats.getRating(),
                            sendCounts.getOrDefault(gym.getId(), 0L),
                            monthlyUserCounts.getOrDefault(gym.getId(), 0L));
                    return stats;
                })
                .toList();

        gymStatsRepository.saveAll(rows);
    }

    private static long nullToZero(Long value) {
        return value == null ? 0L : value;
    }
}
