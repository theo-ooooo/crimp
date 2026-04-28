package io.crimp.domain.gym;

import io.crimp.core.entity.enums.GymStatus;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.repository.gym.GymRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@org.springframework.context.annotation.Profile("!test")
public class GymService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    private final GymRepository gymRepository;
    private final BrandNormalizer brandNormalizer;

    public GymService(GymRepository gymRepository, BrandNormalizer brandNormalizer) {
        this.gymRepository = gymRepository;
        this.brandNormalizer = brandNormalizer;
    }

    @Transactional(readOnly = true)
    public GymSearchResult search(Long cursorId, String keyword, String brand, Integer size) {
        int pageSize = capSize(size);
        String k = isBlank(keyword) ? null : keyword.trim();
        // brand 입력은 canonical 브랜드명으로 정규화 (예: `The Climb` / `더 클라임` → `더클라임`).
        // 정규화에 실패한(사전에 없는) 입력은 trim 한 원본을 그대로 사용 — DB 에 동일 표기가
        // 있으면 매칭, 없으면 0건.
        String b = isBlank(brand) ? null : brandNormalizer.normalize(brand);
        Slice<Gym> slice = gymRepository.search(cursorId, k, b, PageRequest.of(0, pageSize));
        List<GymView> views = slice.getContent().stream().map(GymService::toView).toList();
        Long nextCursor = slice.hasNext() && !views.isEmpty()
                ? slice.getContent().get(slice.getContent().size() - 1).getId()
                : null;
        return new GymSearchResult(views, nextCursor, pageSize);
    }

    @Transactional(readOnly = true)
    public GymView getByExtId(String extId) {
        Gym gym = gymRepository.findByExtIdAndStatus(extId, GymStatus.ACTIVE)
                .orElseThrow(() -> new GymException("GYM_NOT_FOUND", "Gym " + extId + " not found"));
        return toView(gym);
    }

    private static int capSize(Integer size) {
        if (size == null) return DEFAULT_PAGE_SIZE;
        if (size <= 0) return DEFAULT_PAGE_SIZE;
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static GymView toView(Gym g) {
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
                g.getFeaturesJson()
        );
    }

    public record GymSearchResult(List<GymView> items, Long nextCursor, int size) {}
}
