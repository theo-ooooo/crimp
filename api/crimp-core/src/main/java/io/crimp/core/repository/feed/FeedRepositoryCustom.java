package io.crimp.core.repository.feed;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

/**
 * 피드(SessionAttempt 기반 view-projection) 커서 페이지네이션 쿼리.
 *
 * <p>구현은 {@link FeedRepositoryImpl} 에 있다. Spring Data JPA 명명 규칙 대신 standalone
 * {@code @Repository} 빈으로 노출되는 이유: 단일 엔티티(SessionAttempt) 가 아닌 5개 테이블을
 * 조인하는 read-only projection 이라 {@code JpaRepository<E, ID>} 컴포지트 패턴에 매끄럽게
 * 들어맞지 않는다.
 */
public interface FeedRepositoryCustom {

    /**
     * 피드 조회.
     *
     * <p>정렬은 {@code SessionAttempt.id DESC} 고정 — 사용자가 시도를 소급 입력해도 단조성을 유지하기
     * 위해 logged_at 대신 surrogate id 를 커서로 사용한다(타 컨트롤러 동일 패턴).
     *
     * <p>fetch 패턴: {@code pageSize + 1} 개를 가져와 hasNext 를 추론.
     *
     * @param requesterUserId 요청자 user id (FRIENDS 필터에서 follower 식별)
     * @param mode            필터 모드
     * @param cursor          이전 페이지 마지막 attempt.id (없으면 null = 첫 페이지)
     * @param gymIdFilter     MY_GYM 모드에서만 사용 — 호출자가 미리 해석한 gymId
     * @param pageable        페이지 크기 정보. 정렬은 무시되고 항상 id DESC 강제
     * @return Slice. 본인이 팔로잉 중인 사용자가 없는 등 자연스러운 빈 결과는 빈 Slice
     */
    Slice<FeedRow> findFeed(
            long requesterUserId,
            FeedQueryMode mode,
            Long cursor,
            Long gymIdFilter,
            Pageable pageable);
}
