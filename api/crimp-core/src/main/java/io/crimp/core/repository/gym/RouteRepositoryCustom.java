package io.crimp.core.repository.gym;

import io.crimp.core.entity.gym.Route;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

/**
 * 루트 목록 조회용 커스텀 리포지토리.
 * QueryDSL 로 커서 페이지네이션과 정렬(id DESC ≒ 최근 세팅 우선)을 제공한다.
 */
public interface RouteRepositoryCustom {

    /**
     * 특정 암장의 활성 루트(removed_at IS NULL)를 커서 페이지네이션으로 조회한다.
     * 정렬 기준은 id DESC — 최근 등록 루트 우선. setAt 은 NULL 허용이라 커서 단조성 보장 곤란.
     */
    Slice<Route> findByGymIdCursor(long gymId, Long cursorId, Pageable pageable);
}
