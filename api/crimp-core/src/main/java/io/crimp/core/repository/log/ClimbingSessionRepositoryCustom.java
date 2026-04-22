package io.crimp.core.repository.log;

import io.crimp.core.entity.log.ClimbingSession;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

public interface ClimbingSessionRepositoryCustom {
    /**
     * 본인 세션 커서 페이지네이션. 정렬은 id DESC (최신 생성 우선).
     * started_at 기반 정렬은 유저가 과거를 소급 입력할 수 있어 단조성 보장 불가 → id 사용.
     */
    Slice<ClimbingSession> searchMine(long userId, Long cursorId, Pageable pageable);
}
