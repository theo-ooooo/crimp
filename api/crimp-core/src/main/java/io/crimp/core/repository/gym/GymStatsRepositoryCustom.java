package io.crimp.core.repository.gym;

import io.crimp.core.entity.enums.AttemptResult;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface GymStatsRepositoryCustom {

    List<GymStatsCountRow> countSendsByGymId(Collection<AttemptResult> results);

    List<GymStatsCountRow> countMonthlyUsersByGymId(Instant fromInclusive);
}
