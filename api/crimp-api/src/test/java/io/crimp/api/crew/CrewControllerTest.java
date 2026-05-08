package io.crimp.api.crew;

import io.crimp.api.security.CrimpPrincipal;
import io.crimp.core.entity.enums.CrewJoinPolicy;
import io.crimp.core.entity.enums.CrewLevelBand;
import io.crimp.core.entity.enums.CrewStyle;
import io.crimp.domain.crew.CrewHomeGymView;
import io.crimp.domain.crew.CrewOwnerView;
import io.crimp.domain.crew.CrewService;
import io.crimp.domain.crew.CrewView;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CrewControllerTest {

    private CrewService crewService;
    private CrewController controller;

    @BeforeEach
    void setUp() {
        crewService = mock(CrewService.class);
        controller = new CrewController(crewService);
    }

    @Test
    void list_maps_domain_result() {
        when(crewService.search(7L, null, "강남", null, null, null, null, 20))
                .thenReturn(new CrewService.CrewSearchResult(List.of(view("01JCREW", "MEMBER")), 10L, 20));

        CrewController.CrewListResponse res = controller.list(
                new CrimpPrincipal(7L, "01JUSER"), null, "강남", null, null, null, null, 20);

        assertThat(res.items()).hasSize(1);
        assertThat(res.items().get(0).extId()).isEqualTo("01JCREW");
        assertThat(res.items().get(0).homeGym().name()).isEqualTo("더클라임 강남점");
        assertThat(res.items().get(0).myStatus()).isEqualTo("MEMBER");
        assertThat(res.page().nextCursor()).isEqualTo(10L);
    }

    @Test
    void detail_includes_owner_and_createdAt() {
        when(crewService.getByExtId(7L, "01JCREW"))
                .thenReturn(view("01JCREW", "OWNER"));

        CrewController.CrewDetailResponse res = controller.detail(
                new CrimpPrincipal(7L, "01JUSER"), "01JCREW");

        assertThat(res.owner().extId()).isEqualTo("01JOWNER");
        assertThat(res.createdAt()).isEqualTo(Instant.parse("2026-05-08T00:00:00Z"));
    }

    private static CrewView view(String extId, String myStatus) {
        return new CrewView(
                extId,
                "강남 퇴근볼더",
                "평일 저녁 강남권",
                "V3~V6 중심",
                "서울 강남",
                new CrewHomeGymView("01JGYM", "더클라임 강남점"),
                CrewLevelBand.INTERMEDIATE,
                CrewStyle.BOULDERING,
                18,
                30,
                CrewJoinPolicy.APPROVAL,
                myStatus,
                new CrewOwnerView("01JOWNER", "크루장"),
                Instant.parse("2026-05-08T00:00:00Z"));
    }
}
