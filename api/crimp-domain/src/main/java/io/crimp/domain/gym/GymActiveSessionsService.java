package io.crimp.domain.gym;

import io.crimp.core.entity.enums.GymStatus;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.repository.gym.GymRepository;
import io.crimp.core.repository.log.GymActiveSessionRow;
import io.crimp.core.repository.log.SessionAttemptRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@Profile("!test")
public class GymActiveSessionsService {

    private static final List<String> BUCKET_ORDER = List.of(
            "V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8+");

    private final GymRepository gymRepository;
    private final SessionAttemptRepository attemptRepository;

    public GymActiveSessionsService(GymRepository gymRepository,
                                    SessionAttemptRepository attemptRepository) {
        this.gymRepository = gymRepository;
        this.attemptRepository = attemptRepository;
    }

    @Transactional(readOnly = true)
    public GymActiveSessionsView get(String gymExtId) {
        Gym gym = gymRepository.findByExtIdAndStatus(gymExtId, GymStatus.ACTIVE)
                .orElseThrow(() -> new GymException("GYM_NOT_FOUND", "Gym " + gymExtId + " not found"));

        List<GymActiveSessionRow> rows = attemptRepository.findActiveSessionsByGymId(gym.getId());
        if (rows.isEmpty()) {
            return GymActiveSessionsView.empty();
        }

        Map<Long, GymActiveSessionRow> latestBySession = new LinkedHashMap<>();
        for (GymActiveSessionRow row : rows) {
            latestBySession.putIfAbsent(row.sessionId(), row);
        }

        long activeUsers = latestBySession.values().stream()
                .map(GymActiveSessionRow::userId)
                .distinct()
                .count();

        Map<String, Long> bucketCounts = new LinkedHashMap<>();
        for (String grade : BUCKET_ORDER) {
            bucketCounts.put(grade, 0L);
        }

        for (GymActiveSessionRow row : latestBySession.values()) {
            String bucket = bucketGrade(row.gradeValue(), row.gradeNumeric());
            if (bucket != null) {
                bucketCounts.put(bucket, bucketCounts.get(bucket) + 1L);
            }
        }

        List<GymActiveSessionsView.GradeBucket> gradeBuckets = bucketCounts.entrySet().stream()
                .map(e -> new GymActiveSessionsView.GradeBucket(e.getKey(), e.getValue()))
                .toList();
        return new GymActiveSessionsView(activeUsers, gradeBuckets);
    }

    private static String bucketGrade(String gradeValue, BigDecimal gradeNumeric) {
        if (gradeNumeric != null) {
            int numeric = gradeNumeric.intValue();
            return numeric >= 8 ? "V8+" : "V" + Math.max(numeric, 0);
        }
        if (gradeValue == null) {
            return null;
        }
        String normalized = gradeValue.trim().toUpperCase(Locale.ROOT);
        if (!normalized.startsWith("V")) {
            return null;
        }
        int plusIdx = normalized.indexOf('+');
        String core = plusIdx >= 0 ? normalized.substring(1, plusIdx) : normalized.substring(1);
        try {
            int numeric = Integer.parseInt(core);
            return numeric >= 8 ? "V8+" : "V" + Math.max(numeric, 0);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
