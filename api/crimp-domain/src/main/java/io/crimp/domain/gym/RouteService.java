package io.crimp.domain.gym;

import io.crimp.core.entity.enums.GymStatus;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.entity.gym.Route;
import io.crimp.core.repository.gym.GymRepository;
import io.crimp.core.repository.gym.RouteRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 암장 루트 목록 조회 서비스.
 *
 * 활성 암장(status=ACTIVE)에 대해서만 응답하며, 소프트 딜리트된 루트(removed_at IS NULL 이 아닌)는 제외한다.
 */
@Service
@Profile("!test")
public class RouteService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    private final GymRepository gymRepository;
    private final RouteRepository routeRepository;

    public RouteService(GymRepository gymRepository, RouteRepository routeRepository) {
        this.gymRepository = gymRepository;
        this.routeRepository = routeRepository;
    }

    @Transactional(readOnly = true)
    public RoutePage listByGym(String gymExtId, Long cursor, Integer size) {
        Gym gym = gymRepository.findByExtIdAndStatus(gymExtId, GymStatus.ACTIVE)
                .orElseThrow(() -> new GymException("GYM_NOT_FOUND", "Gym " + gymExtId + " not found"));

        int pageSize = capSize(size);
        Slice<Route> slice = routeRepository.findByGymIdCursor(gym.getId(), cursor, PageRequest.of(0, pageSize));
        List<RouteView> items = slice.getContent().stream().map(RouteService::toView).toList();
        Long nextCursor = slice.hasNext() && !slice.getContent().isEmpty()
                ? slice.getContent().get(slice.getContent().size() - 1).getId()
                : null;
        return new RoutePage(items, nextCursor, pageSize);
    }

    private static int capSize(Integer size) {
        if (size == null || size <= 0) return DEFAULT_PAGE_SIZE;
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private static RouteView toView(Route r) {
        return new RouteView(
                r.getExtId(),
                r.getName(),
                r.getColor(),
                r.getGradeScale() != null ? r.getGradeScale().name() : null,
                r.getGradeValue(),
                r.getGradeNumeric(),
                r.getSetter(),
                r.getSetAt()
        );
    }

    /**
     * 루트 목록 페이지 결과.
     *
     * @param items       조회된 루트 뷰 (실제 반환 건수 = {@code items.size()})
     * @param nextCursor  다음 페이지 커서. 더 조회할 데이터가 없으면 null.
     * @param pageSize    요청된(또는 기본·상한 적용된) 페이지 크기. 실제 반환 건수와 다를 수 있음.
     */
    public record RoutePage(List<RouteView> items, Long nextCursor, int pageSize) {}
}
