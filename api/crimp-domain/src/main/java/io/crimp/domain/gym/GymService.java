package io.crimp.domain.gym;

import io.crimp.core.entity.enums.GymStatus;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.repository.gym.GymRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
@org.springframework.context.annotation.Profile("!test")
public class GymService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    private final GymRepository gymRepository;
    private final BrandNormalizer brandNormalizer;
    private final GymStatsService gymStatsService;

    public GymService(GymRepository gymRepository, BrandNormalizer brandNormalizer, GymStatsService gymStatsService) {
        this.gymRepository = gymRepository;
        this.brandNormalizer = brandNormalizer;
        this.gymStatsService = gymStatsService;
    }

    @Transactional(readOnly = true)
    public GymSearchResult search(Long cursorId, String keyword, String brand, Integer size) {
        return search(cursorId, keyword, brand, size, null, null);
    }

    /**
     * gym 검색 — keyword/brand 필터 + 선택적 거리 정렬 (lat,lng 둘 다 있을 때).
     *
     * <p>거리 정렬 모드: cursor 페이지네이션을 단순화 — 첫 페이지 (size 만큼) 만 반환,
     * nextCursor=null. 큰 데이터셋이면 후속에 ST_Distance_Sphere + spatial index 로 정교화.
     */
    @Transactional(readOnly = true)
    public GymSearchResult search(Long cursorId, String keyword, String brand, Integer size,
                                  Double centerLat, Double centerLng) {
        int pageSize = capSize(size);
        String k = isBlank(keyword) ? null : keyword.trim();
        // brand 입력은 canonical 브랜드명으로 정규화 (예: `The Climb` / `더 클라임` → `더클라임`).
        // 정규화에 실패한(사전에 없는) 입력은 trim 한 원본을 그대로 사용 — DB 에 동일 표기가
        // 있으면 매칭, 없으면 0건.
        String b = isBlank(brand) ? null : brandNormalizer.normalize(brand);
        boolean nearMode = centerLat != null && centerLng != null
                && Double.isFinite(centerLat) && Double.isFinite(centerLng);

        if (nearMode) {
            // 거리 정렬: cursor 무시, 키워드/브랜드 필터 후 lat/lng 가 있는 행만 가져와 정렬.
            // 데이터가 적은 베타 단계라 in-memory 정렬로 충분.
            List<Gym> all = gymRepository.searchAllForDistance(k, b);
            Map<Long, GymStatsSnapshot> statsByGymId = gymStatsService.loadByGymIds(
                    all.stream().map(Gym::getId).toList());
            List<GymView> sorted = all.stream()
                    .filter(g -> g.getLat() != null && g.getLng() != null)
                    .map(g -> toView(g, statsByGymId.getOrDefault(g.getId(), GymStatsSnapshot.empty()),
                            haversineMeters(
                            centerLat, centerLng,
                            g.getLat().doubleValue(), g.getLng().doubleValue())))
                    .sorted(Comparator.comparingDouble(GymView::distanceMeters))
                    .limit(pageSize)
                    .toList();
            return new GymSearchResult(sorted, null, pageSize);
        }

        Slice<Gym> slice = gymRepository.search(cursorId, k, b, PageRequest.of(0, pageSize));
        Map<Long, GymStatsSnapshot> statsByGymId = gymStatsService.loadByGymIds(
                slice.getContent().stream().map(Gym::getId).toList());
        List<GymView> views = slice.getContent().stream()
                .map(g -> toView(g, statsByGymId.getOrDefault(g.getId(), GymStatsSnapshot.empty()), null))
                .toList();
        Long nextCursor = slice.hasNext() && !views.isEmpty()
                ? slice.getContent().get(slice.getContent().size() - 1).getId()
                : null;
        return new GymSearchResult(views, nextCursor, pageSize);
    }

    @Transactional(readOnly = true)
    public GymView getByExtId(String extId) {
        Gym gym = gymRepository.findByExtIdAndStatus(extId, GymStatus.ACTIVE)
                .orElseThrow(() -> new GymException("GYM_NOT_FOUND", "Gym " + extId + " not found"));
        GymStatsSnapshot stats = gymStatsService.loadByGymIds(List.of(gym.getId()))
                .getOrDefault(gym.getId(), GymStatsSnapshot.empty());
        return toView(gym, stats, null);
    }

    private static int capSize(Integer size) {
        if (size == null) return DEFAULT_PAGE_SIZE;
        if (size <= 0) return DEFAULT_PAGE_SIZE;
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    /**
     * Haversine 거리 (m). 지구 반지름 6,371,000m. 베타 데이터셋 (수십~수백 gym) 에 충분.
     * 후속에 ST_Distance_Sphere + spatial index 로 마이그레이트.
     */
    static double haversineMeters(double lat1, double lng1, double lat2, double lng2) {
        double R = 6_371_000.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private static GymView toView(Gym g, GymStatsSnapshot stats, Double distanceMeters) {
        return new GymView(
                g.getExtId(),
                g.getName(),
                g.getBrand(),
                g.getAddress(),
                g.getLat(),
                g.getLng(),
                g.getPhone(),
                g.getOpeningHoursJson(),
                g.getSettingCycleDays() != null ? g.getSettingCycleDays().intValue() : null,
                g.getFeaturesJson(),
                stats.rating(),
                stats.sendCount(),
                stats.monthlyUserCount(),
                distanceMeters
        );
    }

    public record GymSearchResult(List<GymView> items, Long nextCursor, int size) {}
}
