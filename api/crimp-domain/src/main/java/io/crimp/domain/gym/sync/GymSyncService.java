package io.crimp.domain.gym.sync;

import io.crimp.common.id.UlidGenerator;
import io.crimp.core.entity.enums.GymStatus;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.repository.gym.GymRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * 외부 위치 검색 소스로부터 가져온 매장 목록과 DB 를 동기화한다.
 *
 * <p>본 PR(스켈레톤·Phase 1.5+ 본격 도입 전) 에서는 다음을 제공한다:
 * <ul>
 *   <li>{@code dryRun}: fetch + diff 만 수행, DB 미수정. 결과를 로깅·반환해서 운영자가
 *       검토 가능 — 운영 안전장치 1차.</li>
 *   <li>{@code apply}: dry-run 결과를 받아 신규 INSERT 와 update 를 트랜잭션으로 적용.
 *       임계치(threshold) 초과 시 {@link IllegalStateException} 으로 차단.</li>
 *   <li>폐업 마킹 (status=CLOSED) 은 단일 호출로는 결정 불가 — 다중 지역 호출 결과를
 *       모두 합친 후 결정해야 하므로 본 단계에서는 일관 처리하지 않는다 (Phase 1.5).</li>
 * </ul>
 *
 * <p>본 서비스 자체는 트리거(스케줄러·admin API) 와 분리되어 호출 가능 — 단위·통합
 * 테스트에서 쉽게 사용.
 */
@Service
@org.springframework.context.annotation.Profile("!test")
public class GymSyncService {

    private static final Logger log = LoggerFactory.getLogger(GymSyncService.class);

    /**
     * 한 번의 apply 에서 전체 row 의 몇 % 까지를 변경/추가로 허용할지. 외부 소스가
     * 비정상적으로 큰 변동을 반환했을 때 (예: 키 만료로 0개) 전체 데이터가 무효화되는
     * 사고를 막는 운영 안전장치.
     */
    private static final double DEFAULT_CHANGE_RATIO_LIMIT = 0.5;

    private final GymSyncSource source;
    private final GymRepository gymRepository;

    public GymSyncService(GymSyncSource source, GymRepository gymRepository) {
        this.source = source;
        this.gymRepository = gymRepository;
    }

    /**
     * 주어진 좌표 영역에서 외부 소스를 호출해 diff 결과만 계산. DB 는 변경하지 않는다.
     */
    @Transactional(readOnly = true)
    public GymSyncDiff.Result dryRun(BigDecimal lat, BigDecimal lng, int radiusMeters) {
        List<RemoteGym> remote = source.fetchByRadius(lat, lng, radiusMeters);
        List<Gym> current = gymRepository.findAll();
        GymSyncDiff.Result result = GymSyncDiff.compute(remote, current);
        log.info(
                "[gym-sync] dry-run lat={} lng={} radius={} remote={} current={} additions={} updates={} missing={}",
                lat, lng, radiusMeters,
                remote.size(), current.size(),
                result.additions().size(), result.updates().size(), result.missingFromRemote().size());
        return result;
    }

    /**
     * dry-run 에서 산출한 diff 를 DB 에 적용. 안전장치:
     *  - 변경 비율이 {@link #DEFAULT_CHANGE_RATIO_LIMIT} 초과면 {@link IllegalStateException}.
     *  - 폐업 마킹은 본 단계에서 적용 안 함.
     *
     * @return 실제 적용된 추가/업데이트 카운트
     */
    @Transactional
    public ApplyReport apply(GymSyncDiff.Result diff) {
        int currentSize = (int) gymRepository.count();
        int touched = diff.additions().size() + diff.updates().size();
        if (currentSize > 0) {
            double ratio = (double) touched / currentSize;
            if (ratio > DEFAULT_CHANGE_RATIO_LIMIT) {
                throw new IllegalStateException(
                        "Gym sync change ratio " + ratio + " exceeds limit "
                                + DEFAULT_CHANGE_RATIO_LIMIT + " — aborting.");
            }
        }

        int inserted = 0;
        for (RemoteGym r : diff.additions()) {
            Gym created = Gym.create(
                    UlidGenerator.next(),
                    r.name(),
                    r.address(),
                    r.lat(),
                    r.lng());
            gymRepository.save(created);
            inserted++;
        }

        // update 는 좌표·brand·phone 만 갱신 (이름/주소는 매칭 키이므로 변경 X).
        //
        // [PR #85 리뷰 B1] dryRun() 의 @Transactional(readOnly=true) 가 종료되면 그 안에서
        // 가져온 Gym 들은 detached 상태가 됨. 이 상태에서 mutate 해도 본 메서드의 새 트랜잭션은
        // 그 인스턴스를 알지 못해 dirty check 가 동작하지 않음 → UPDATE 누락. 따라서 diff 의
        // current 는 ID 만 신뢰하고, 본 트랜잭션의 영속 컨텍스트에서 재조회한 managed entity 에
        // mutate 한다. 재조회 실패(다른 경로로 row 가 삭제된 경우)는 skip + log + 카운터 미증가.
        int updated = 0;
        int updateSkipped = 0;
        for (GymSyncDiff.UpdateCandidate u : diff.updates()) {
            Long id = u.current().getId();
            var managedOpt = gymRepository.findById(id);
            if (managedOpt.isEmpty()) {
                updateSkipped++;
                log.warn("[gym-sync] update skipped (row no longer exists): id={} name={}",
                        id, u.current().getName());
                continue;
            }
            Gym managed = managedOpt.get();
            RemoteGym r = u.remote();
            managed.applyRemoteUpdate(r.brand(), r.phone(), r.lat(), r.lng());
            updated++;
            log.info("[gym-sync] update applied: id={} name={}", managed.getId(), managed.getName());
        }

        int missingFromRemote = diff.missingFromRemote().size();
        log.info("[gym-sync] apply inserted={} updated={} update-skipped={} closed-pending={}",
                inserted, updated, updateSkipped, missingFromRemote);
        return new ApplyReport(inserted, updated, missingFromRemote);
    }

    public record ApplyReport(int inserted, int updated, int missingFromRemote) {}
}
