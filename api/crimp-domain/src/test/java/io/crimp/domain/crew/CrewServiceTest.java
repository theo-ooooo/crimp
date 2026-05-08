package io.crimp.domain.crew;

import io.crimp.core.entity.enums.CrewJoinPolicy;
import io.crimp.core.entity.enums.CrewLevelBand;
import io.crimp.core.entity.enums.CrewMemberRole;
import io.crimp.core.entity.enums.CrewMemberStatus;
import io.crimp.core.entity.enums.CrewStyle;
import io.crimp.core.repository.crew.CrewRepository;
import io.crimp.core.repository.crew.CrewSearchRow;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.SliceImpl;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CrewServiceTest {

    private CrewRepository crewRepository;
    private CrewService service;

    @BeforeEach
    void setUp() {
        crewRepository = mock(CrewRepository.class);
        service = new CrewService(crewRepository);
    }

    @Test
    void search_maps_rows_and_next_cursor() {
        CrewSearchRow row1 = row(20L, "01JCREW1", CrewMemberRole.OWNER, CrewMemberStatus.ACTIVE, null);
        CrewSearchRow row2 = row(10L, "01JCREW2", null, null, "01JREQ");
        when(crewRepository.searchPublic(eq(100L), eq("강남"), eq("서울"), eq("01JGYM"),
                eq(CrewLevelBand.INTERMEDIATE), eq(CrewStyle.BOULDERING), eq(7L), any()))
                .thenReturn(new SliceImpl<>(List.of(row1, row2), Pageable.ofSize(2), true));

        var result = service.search(7L, 100L, " 강남 ", " 서울 ", "01JGYM",
                "intermediate", "bouldering", 2);

        assertThat(result.items()).hasSize(2);
        assertThat(result.items().get(0).myStatus()).isEqualTo("OWNER");
        assertThat(result.items().get(1).myStatus()).isEqualTo("PENDING");
        assertThat(result.nextCursor()).isEqualTo(10L);
        assertThat(result.size()).isEqualTo(2);
    }

    @Test
    void search_rejects_invalid_enum_filter() {
        assertThatThrownBy(() -> service.search(1L, null, null, null, null,
                "expert", null, null))
                .isInstanceOf(CrewException.class)
                .satisfies(e -> assertThat(((CrewException) e).code()).isEqualTo("INVALID_CREW_REQUEST"));
    }

    @Test
    void detail_notFound_throws() {
        when(crewRepository.findPublicDetail("nope", 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getByExtId(1L, "nope"))
                .isInstanceOf(CrewException.class)
                .satisfies(e -> assertThat(((CrewException) e).code()).isEqualTo("CREW_NOT_FOUND"));
    }

    private static CrewSearchRow row(Long id, String extId, CrewMemberRole myRole,
                                     CrewMemberStatus myStatus, String pendingRequestExtId) {
        return new CrewSearchRow(
                id,
                extId,
                "강남 퇴근볼더",
                "평일 저녁 강남권",
                "V3~V6 중심",
                "서울 강남",
                CrewLevelBand.INTERMEDIATE,
                CrewStyle.BOULDERING,
                CrewJoinPolicy.APPROVAL,
                30,
                18,
                Instant.parse("2026-05-08T00:00:00Z"),
                "01JGYM",
                "더클라임 강남점",
                "01JOWNER",
                "크루장",
                myRole,
                myStatus,
                pendingRequestExtId);
    }
}
