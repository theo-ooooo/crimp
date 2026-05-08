package io.crimp.api.crew;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import io.crimp.api.common.GlobalResponseWrapper;
import io.crimp.api.security.CrimpPrincipal;
import io.crimp.core.entity.enums.CrewJoinPolicy;
import io.crimp.core.entity.enums.CrewJoinRequestStatus;
import io.crimp.core.entity.enums.CrewLevelBand;
import io.crimp.core.entity.enums.CrewStyle;
import io.crimp.domain.crew.CreateCrewCommand;
import io.crimp.domain.crew.CreateCrewJoinRequestCommand;
import io.crimp.domain.crew.CrewException;
import io.crimp.domain.crew.CrewHomeGymView;
import io.crimp.domain.crew.CrewJoinRequestView;
import io.crimp.domain.crew.CrewMemberView;
import io.crimp.domain.crew.CrewOwnerView;
import io.crimp.domain.crew.CrewService;
import io.crimp.domain.crew.CrewView;
import io.crimp.domain.crew.UpdateCrewCommand;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CrewControllerTest {

    private CrewService crewService;
    private CrewController controller;
    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        crewService = mock(CrewService.class);
        controller = new CrewController(crewService);
        objectMapper = JsonMapper.builder().findAndAddModules().build();
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(authPrincipalResolver())
                .setControllerAdvice(new GlobalResponseWrapper())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();
    }

    @Test
    void create_maps_request_to_command() {
        when(crewService.create(eq(7L), any(CreateCrewCommand.class)))
                .thenReturn(view("01JCREW", "OWNER"));

        CrewController.CrewDetailResponse res = controller.create(
                new CrimpPrincipal(7L, "01JUSER"),
                new CrewController.CreateCrewRequest(
                        "강남 퇴근볼더", "평일 저녁", "V3~V6 중심", "서울 강남",
                        null, "INTERMEDIATE", "BOULDERING", 30));

        assertThat(res.extId()).isEqualTo("01JCREW");
        assertThat(res.myStatus()).isEqualTo("OWNER");
    }

    @Test
    void create_http_maps_request_and_wraps_response() throws Exception {
        when(crewService.create(eq(7L), any(CreateCrewCommand.class)))
                .thenReturn(view("01JCREW", "OWNER"));

        mockMvc.perform(post("/api/v1/crews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CrewController.CreateCrewRequest(
                                "강남 퇴근볼더", "평일 저녁", "V3~V6 중심", "서울 강남",
                                null, "INTERMEDIATE", "BOULDERING", 30))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(true))
                .andExpect(jsonPath("$.data.extId").value("01JCREW"))
                .andExpect(jsonPath("$.data.myStatus").value("OWNER"));
    }

    @Test
    void create_http_rejectsInvalidCapacity() throws Exception {
        mockMvc.perform(post("/api/v1/crews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CrewController.CreateCrewRequest(
                                "강남 퇴근볼더", null, null, null, null, null, null, 1))))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(crewService);
    }

    @Test
    void create_http_mapsCrewExceptionToConflict() throws Exception {
        when(crewService.create(eq(7L), any(CreateCrewCommand.class)))
                .thenThrow(new CrewException("CREW_NAME_TAKEN", "Crew name already taken"));

        mockMvc.perform(post("/api/v1/crews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CrewController.CreateCrewRequest(
                                "강남 퇴근볼더", null, null, null, null, null, null, null))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(false))
                .andExpect(jsonPath("$.error.code").value("CREW_NAME_TAKEN"));
    }

    @Test
    void update_http_mapsCrewExceptionToForbidden() throws Exception {
        when(crewService.update(eq(7L), eq("01JCREW"), any(UpdateCrewCommand.class)))
                .thenThrow(new CrewException("CREW_FORBIDDEN", "Crew admin permission required"));

        mockMvc.perform(patch("/api/v1/crews/01JCREW")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CrewController.UpdateCrewRequest(
                                "새 크루", null, null, null, null, false,
                                null, null, null, false))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(false))
                .andExpect(jsonPath("$.error.code").value("CREW_FORBIDDEN"));
    }

    @Test
    void requestJoin_http_maps_request_and_wraps_response() throws Exception {
        when(crewService.requestJoin(eq(7L), eq("01JCREW"), any(CreateCrewJoinRequestCommand.class)))
                .thenReturn(joinRequestView("01JREQ", CrewJoinRequestStatus.PENDING));

        mockMvc.perform(post("/api/v1/crews/01JCREW/join-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CrewController.CreateJoinRequest("가입하고 싶어요"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(true))
                .andExpect(jsonPath("$.data.extId").value("01JREQ"))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.applicant.extId").value("01JUSER"));
    }

    @Test
    void listJoinRequests_http_maps_result() throws Exception {
        when(crewService.listJoinRequests(7L, "01JCREW", "PENDING", null, 20))
                .thenReturn(new CrewService.CrewJoinRequestSearchResult(
                        List.of(joinRequestView("01JREQ", CrewJoinRequestStatus.PENDING)), null, 20));

        mockMvc.perform(get("/api/v1/crews/01JCREW/join-requests")
                        .param("status", "PENDING")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].extId").value("01JREQ"))
                .andExpect(jsonPath("$.data.items[0].applicant.nickname").value("신청자"))
                .andExpect(jsonPath("$.data.page.size").value(20));
    }

    @Test
    void approveJoinRequest_http_maps_conflict() throws Exception {
        when(crewService.approveJoinRequest(7L, "01JCREW", "01JREQ"))
                .thenThrow(new CrewException("CREW_CAPACITY_FULL", "Crew capacity is full"));

        mockMvc.perform(post("/api/v1/crews/01JCREW/join-requests/01JREQ:approve"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("CREW_CAPACITY_FULL"));
    }

    @Test
    void cancelMyJoinRequest_http_maps_result() throws Exception {
        when(crewService.cancelMyJoinRequest(7L, "01JCREW"))
                .thenReturn(joinRequestView("01JREQ", CrewJoinRequestStatus.CANCELED));

        mockMvc.perform(delete("/api/v1/crews/01JCREW/join-requests/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELED"));
    }

    @Test
    void listMembers_http_maps_result() throws Exception {
        when(crewService.listMembers(7L, "01JCREW", null, 20))
                .thenReturn(new CrewService.CrewMemberSearchResult(
                        List.of(memberView("01JUSER", "MEMBER")), null, 20));

        mockMvc.perform(get("/api/v1/crews/01JCREW/members")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].userExtId").value("01JUSER"))
                .andExpect(jsonPath("$.data.items[0].nickname").value("멤버"))
                .andExpect(jsonPath("$.data.items[0].role").value("MEMBER"))
                .andExpect(jsonPath("$.data.page.size").value(20));
    }

    @Test
    void leaveCrew_http_returnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/v1/crews/01JCREW/members/me"))
                .andExpect(status().isNoContent());
    }

    @Test
    void leaveCrew_http_mapsOwnerLeaveBlocked() throws Exception {
        org.mockito.Mockito.doThrow(new CrewException("CREW_OWNER_LEAVE_BLOCKED", "Last crew owner cannot leave"))
                .when(crewService).leaveCrew(7L, "01JCREW");

        mockMvc.perform(delete("/api/v1/crews/01JCREW/members/me"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("CREW_OWNER_LEAVE_BLOCKED"));
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

    @Test
    void update_maps_request_to_command() {
        when(crewService.update(eq(7L), eq("01JCREW"), any(UpdateCrewCommand.class)))
                .thenReturn(view("01JCREW", "OWNER"));

        CrewController.CrewDetailResponse res = controller.update(
                new CrimpPrincipal(7L, "01JUSER"),
                "01JCREW",
                new CrewController.UpdateCrewRequest(
                        "새 크루", null, null, null, null, false,
                        "ADVANCED", "LEAD", null, true));

        assertThat(res.extId()).isEqualTo("01JCREW");
        assertThat(res.owner().nickname()).isEqualTo("크루장");
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

    private static CrewJoinRequestView joinRequestView(String extId, CrewJoinRequestStatus status) {
        return new CrewJoinRequestView(
                extId,
                "01JCREW",
                "01JUSER",
                "신청자",
                "가입하고 싶어요",
                status,
                null,
                null,
                Instant.parse("2026-05-08T00:00:00Z"));
    }

    private static CrewMemberView memberView(String userExtId, String role) {
        return new CrewMemberView(
                "01JCREW",
                userExtId,
                "멤버",
                io.crimp.core.entity.enums.CrewMemberRole.valueOf(role),
                Instant.parse("2026-05-08T00:00:00Z"));
    }

    private static HandlerMethodArgumentResolver authPrincipalResolver() {
        return new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.hasParameterAnnotation(AuthenticationPrincipal.class)
                        && parameter.getParameterType().equals(CrimpPrincipal.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                          NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                return new CrimpPrincipal(7L, "01JUSER");
            }
        };
    }
}
