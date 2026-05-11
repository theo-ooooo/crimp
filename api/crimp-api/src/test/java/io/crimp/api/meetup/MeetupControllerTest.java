package io.crimp.api.meetup;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import io.crimp.api.common.GlobalResponseWrapper;
import io.crimp.api.security.CrimpPrincipal;
import io.crimp.domain.crew.CreateCrewMeetupCommand;
import io.crimp.domain.crew.CrewException;
import io.crimp.domain.crew.CrewMeetupView;
import io.crimp.domain.crew.CrewService;
import io.crimp.domain.crew.MeetupHostView;
import io.crimp.domain.crew.MeetupParticipantView;
import io.crimp.domain.crew.UpdateCrewMeetupCommand;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class MeetupControllerTest {

    private CrewService crewService;
    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        crewService = mock(CrewService.class);
        objectMapper = JsonMapper.builder().findAndAddModules().build();
        mockMvc = MockMvcBuilders.standaloneSetup(new MeetupController(crewService))
                .setCustomArgumentResolvers(authPrincipalResolver())
                .setControllerAdvice(new GlobalResponseWrapper())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();
    }

    @Test
    void list_http_mapsGlobalMeetups() throws Exception {
        when(crewService.listAllMeetups(7L, 20)).thenReturn(List.of(meetupView()));

        mockMvc.perform(get("/api/v1/meetups").param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(true))
                .andExpect(jsonPath("$.data.items[0].extId").value("01JMEETUP"))
                .andExpect(jsonPath("$.data.items[0].gymName").value("더클라임 강남점"));
    }

    @Test
    void create_http_mapsRequestAndWrapsResponse() throws Exception {
        when(crewService.createMeetup(eq(7L), eq(null), any(CreateCrewMeetupCommand.class)))
                .thenReturn(meetupView());

        mockMvc.perform(post("/api/v1/meetups")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new MeetupController.CreateMeetupRequest(
                                "퇴근 볼더링",
                                "가볍게 두 시간",
                                Instant.parse("2026-05-12T10:00:00Z"),
                                Instant.parse("2026-05-12T12:00:00Z"),
                                null,
                                "01JGYM00000000000000000000",
                                null,
                                8,
                                "OPEN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(true))
                .andExpect(jsonPath("$.data.extId").value("01JMEETUP"));
    }

    @Test
    void create_http_mapsCrewExceptionToEnvelope() throws Exception {
        when(crewService.createMeetup(eq(7L), eq(null), any(CreateCrewMeetupCommand.class)))
                .thenThrow(new CrewException("INVALID_CREW_MEETUP_REQUEST", "startsAt must be in the future"));

        mockMvc.perform(post("/api/v1/meetups")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new MeetupController.CreateMeetupRequest(
                                "퇴근 볼더링",
                                null,
                                Instant.parse("2026-05-10T10:00:00Z"),
                                null,
                                null,
                                null,
                                "강남",
                                8,
                                "OPEN"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(false))
                .andExpect(jsonPath("$.error.code").value("INVALID_CREW_MEETUP_REQUEST"));
    }

    @Test
    void delete_http_mapsHostDelete() throws Exception {
        mockMvc.perform(delete("/api/v1/meetups/01JMEETUP"))
                .andExpect(status().isNoContent());

        verify(crewService).deleteMeetup(7L, "01JMEETUP");
    }

    @Test
    void update_http_mapsRequestAndWrapsResponse() throws Exception {
        when(crewService.updateMeetup(eq(7L), eq("01JMEETUP"), any(UpdateCrewMeetupCommand.class)))
                .thenReturn(meetupView());

        mockMvc.perform(patch("/api/v1/meetups/01JMEETUP")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new MeetupController.UpdateMeetupRequest(
                                "퇴근 볼더링",
                                "수정된 설명",
                                Instant.parse("2026-05-12T11:00:00Z"),
                                null,
                                null,
                                "강남",
                                10,
                                "APPROVAL"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(true))
                .andExpect(jsonPath("$.data.extId").value("01JMEETUP"));
    }

    @Test
    void participants_http_mapsList() throws Exception {
        when(crewService.listMeetupParticipants(7L, "01JMEETUP", "PENDING"))
                .thenReturn(List.of(new MeetupParticipantView(
                        "01JUSER2", "요청자", "PENDING", "참여하고 싶어요",
                        Instant.parse("2026-05-11T01:00:00Z"))));

        mockMvc.perform(get("/api/v1/meetups/01JMEETUP/participants").param("status", "PENDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(true))
                .andExpect(jsonPath("$.data.items[0].userExtId").value("01JUSER2"))
                .andExpect(jsonPath("$.data.items[0].message").value("참여하고 싶어요"));
    }

    @Test
    void approveParticipant_http_mapsDecision() throws Exception {
        when(crewService.approveMeetupParticipant(7L, "01JMEETUP", "01JUSER2"))
                .thenReturn(new MeetupParticipantView(
                        "01JUSER2", "요청자", "ACTIVE", "참여하고 싶어요",
                        Instant.parse("2026-05-11T01:00:00Z")));

        mockMvc.perform(post("/api/v1/meetups/01JMEETUP/participants/01JUSER2:approve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(true))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    private static CrewMeetupView meetupView() {
        return new CrewMeetupView(
                "01JMEETUP",
                "퇴근 볼더링",
                "가볍게 두 시간",
                Instant.parse("2026-05-12T10:00:00Z"),
                Instant.parse("2026-05-12T12:00:00Z"),
                null,
                null,
                "01JGYM00000000000000000000",
                "더클라임 강남점",
                "더클라임 강남점",
                8,
                "OPEN",
                0,
                "NONE",
                new MeetupHostView("01JUSER", "방장"),
                true,
                Instant.parse("2026-05-11T00:00:00Z"));
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
