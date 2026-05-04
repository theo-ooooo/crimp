package io.crimp.api.gym;

import io.crimp.domain.gym.GymRecentActivityService;
import io.crimp.domain.gym.GymActiveSessionsService;
import io.crimp.domain.gym.GymActiveSessionsView;
import io.crimp.domain.gym.GymRecentActivityView;
import io.crimp.domain.gym.GymService;
import io.crimp.domain.gym.RouteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GymControllerTest {

    private GymService gymService;
    private RouteService routeService;
    private GymRecentActivityService recentActivityService;
    private GymActiveSessionsService activeSessionsService;
    private GymController controller;

    @BeforeEach
    void setUp() {
        gymService = mock(GymService.class);
        routeService = mock(RouteService.class);
        recentActivityService = mock(GymRecentActivityService.class);
        activeSessionsService = mock(GymActiveSessionsService.class);
        controller = new GymController(gymService, routeService, recentActivityService, activeSessionsService);
    }

    @Test
    void recentActivity_returns_items_only() {
        when(recentActivityService.list("01HGYM", 3)).thenReturn(List.of(
                new GymRecentActivityView("01HUSER01", "서지우", 250, "V5",
                        io.crimp.core.entity.enums.AttemptResult.SEND,
                        Instant.parse("2026-05-04T01:00:00Z"))));

        GymController.RecentActivityResponse res = controller.recentActivity("01HGYM", 3);

        assertThat(res.items()).hasSize(1);
        assertThat(res.items().get(0).userExtId()).isEqualTo("01HUSER01");
        assertThat(res.items().get(0).avatarColorHue()).isEqualTo(250);
        assertThat(res.items().get(0).result()).isEqualTo(io.crimp.core.entity.enums.AttemptResult.SEND);
    }

    @Test
    void activeSessions_maps_view_to_response() {
        when(activeSessionsService.get("01HGYM")).thenReturn(new GymActiveSessionsView(
                12L,
                List.of(
                        new GymActiveSessionsView.GradeBucket("V0", 1L),
                        new GymActiveSessionsView.GradeBucket("V1", 2L),
                        new GymActiveSessionsView.GradeBucket("V8+", 3L))));

        GymController.ActiveSessionsResponse res = controller.activeSessions("01HGYM");

        assertThat(res.activeUsers()).isEqualTo(12L);
        assertThat(res.gradeBuckets()).hasSize(3);
        assertThat(res.gradeBuckets().get(2).grade()).isEqualTo("V8+");
    }
}
