package io.crimp.domain.gym.sync;

import io.crimp.common.id.UlidGenerator;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.entity.gym.GymSyncLog;
import io.crimp.core.repository.gym.GymRepository;
import io.crimp.core.repository.gym.GymSyncLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * 외부 위치 검색 소스로부터 가져온 매장 목록과 DB 를 동기화한다.
 *
 * <p>제공하는 작업:
 * <ul>
 *   <li>{@code dryRun}: fetch + diff 만 수행, DB 미수정. 결과를 로깅·반환해서 운영자가
 *       검토 가능 — 운영 안전장치 1차.</li>
 *   <li>{@code apply}: dry-run 결과를 받아 신규 INSERT 와 update 를 트랜잭션으로 적용.
 *       임계치(threshold) 초과 시 {@link ApplyReport.Status#ABORTED_RATIO_GUARD} 로 반환
 *       (예외 throw X). 매 호출마다 {@code gym_sync_log} 에 감사 row 1건 기록.</li>
 *   <li>폐업 마킹 (status=CLOSED) 은 단일 호출로는 결정 불가 — 다중 지역 호출 결과를
 *       모두 합친 후 결정해야 하므로 본 단계에서는 일관 처리하지 않는다.</li>
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
    private final GymSyncLogRepository gymSyncLogRepository;

    public GymSyncService(GymSyncSource source,
                          GymRepository gymRepository,
                          GymSyncLogRepository gymSyncLogRepository) {
        this.source = source;
        this.gymRepository = gymRepository;
        this.gymSyncLogRepository = gymSyncLogRepository;
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
     *  - 변경 비율이 {@link #DEFAULT_CHANGE_RATIO_LIMIT} 초과면 {@link ApplyReport.Status#ABORTED_RATIO_GUARD}
     *    로 반환 (호출자가 status 로 분기 — 예외 X).
     *  - 폐업 마킹은 본 단계에서 적용 안 함.
     *
     * <p>호출 1건당 {@code gym_sync_log} 에 감사 row 1건 기록 (성공·중단 모두). 본 트랜잭션이
     * 커밋되어야 audit 도 함께 보존됨 — apply 단계에서 예외가 발생하면 audit 도 함께 롤백,
     * 운영자는 application 로그(stack trace) 로 추적.
     *
     * @param diff dry-run 으로 산출한 diff
     * @param lat  대상 영역 중심 위도 (audit 컨텍스트)
     * @param lng  대상 영역 중심 경도 (audit 컨텍스트)
     * @param radiusMeters 반경 (audit 컨텍스트)
     */
    @Transactional
    public ApplyReport apply(GymSyncDiff.Result diff,
                             BigDecimal lat, BigDecimal lng, int radiusMeters) {
        Instant occurredAt = Instant.now();
        int currentSize = (int) gymRepository.count();
        int additionsPlanned = diff.additions().size();
        int updatesPlanned = diff.updates().size();
        int missingFromRemote = diff.missingFromRemote().size();

        // 1. 변경 비율 가드 — 초과 시 즉시 ABORTED 로 반환 (DB 변경 X).
        int touched = additionsPlanned + updatesPlanned;
        if (currentSize > 0) {
            double ratio = (double) touched / currentSize;
            if (ratio > DEFAULT_CHANGE_RATIO_LIMIT) {
                String reason = "change ratio " + ratio + " exceeds limit "
                        + DEFAULT_CHANGE_RATIO_LIMIT;
                log.warn("[gym-sync] apply aborted: {}", reason);
                gymSyncLogRepository.save(GymSyncLog.abortedByRatioGuard(
                        occurredAt, lat, lng, radiusMeters,
                        diff.remoteCount(), currentSize,
                        additionsPlanned, updatesPlanned, missingFromRemote,
                        reason));
                return ApplyReport.aborted(reason, additionsPlanned, updatesPlanned, missingFromRemote);
            }
        }

        // 2. 신규 INSERT.
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

        // 3. UPDATE — 좌표·brand·phone 만 갱신 (이름/주소는 매칭 키이므로 변경 X).
        //
        // [PR #85 리뷰 B1] dryRun() 의 @Transactional(readOnly=true) 가 종료되면 그 안에서
        // 가져온 Gym 들은 detached 상태가 됨. 본 메서드의 새 트랜잭션은 그 인스턴스를
        // 모르므로 mutate 해도 dirty check 가 동작하지 않아 UPDATE 누락. 따라서 diff 의
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

        log.info("[gym-sync] apply inserted={} updated={} update-skipped={} closed-pending={}",
                inserted, updated, updateSkipped, missingFromRemote);

        // 4. Audit — 본 TX commit 시 함께 보존.
        gymSyncLogRepository.save(GymSyncLog.applied(
                occurredAt, lat, lng, radiusMeters,
                diff.remoteCount(), currentSize,
                additionsPlanned, updatesPlanned, missingFromRemote,
                inserted, updated, updateSkipped));

        return ApplyReport.applied(inserted, updated, updateSkipped, missingFromRemote);
    }

    /**
     * apply 결과. 호출자(scheduler / admin API) 는 {@link Status} 로 분기 — 예외 X.
     */
    public record ApplyReport(Status status, int inserted, int updated, int updateSkipped,
                              int missingFromRemote, String reason) {

        public enum Status {
            APPLIED,
            ABORTED_RATIO_GUARD
        }

        public static ApplyReport applied(int inserted, int updated, int updateSkipped, int missingFromRemote) {
            return new ApplyReport(Status.APPLIED, inserted, updated, updateSkipped, missingFromRemote, null);
        }

        public static ApplyReport aborted(String reason, int additionsPlanned, int updatesPlanned, int missingFromRemote) {
            // ABORTED 시점엔 inserted/updated/skipped 는 모두 0 — diff 의 plan 카운트는 reason 으로만 노출.
            return new ApplyReport(Status.ABORTED_RATIO_GUARD, 0, 0, 0, missingFromRemote, reason);
        }
    }
}
