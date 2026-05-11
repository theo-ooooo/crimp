package io.crimp.domain.crew;

import io.crimp.core.entity.crew.Crew;
import io.crimp.core.entity.crew.CrewJoinRequest;
import io.crimp.core.entity.crew.CrewMeetup;
import io.crimp.core.entity.crew.CrewMember;
import io.crimp.core.entity.enums.CrewJoinPolicy;
import io.crimp.core.entity.enums.CrewJoinRequestStatus;
import io.crimp.core.entity.enums.CrewLevelBand;
import io.crimp.core.entity.enums.CrewMemberRole;
import io.crimp.core.entity.enums.CrewMemberStatus;
import io.crimp.core.entity.enums.CrewStyle;
import io.crimp.core.entity.enums.GymStatus;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.repository.crew.CrewJoinRequestRepository;
import io.crimp.core.repository.crew.CrewJoinRequestRow;
import io.crimp.core.repository.crew.CrewMemberRepository;
import io.crimp.core.repository.crew.CrewMemberRow;
import io.crimp.core.repository.crew.CrewMeetupRepository;
import io.crimp.core.repository.crew.CrewRepository;
import io.crimp.core.repository.crew.CrewSearchRow;
import io.crimp.core.repository.crew.MeetupParticipantRepository;
import io.crimp.core.repository.gym.GymRepository;
import io.crimp.core.repository.media.MediaAssetRepository;
import io.crimp.core.repository.media.MediaImageVariantRepository;
import io.crimp.common.config.AppProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.SliceImpl;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CrewServiceTest {

    private CrewRepository crewRepository;
    private CrewJoinRequestRepository crewJoinRequestRepository;
    private CrewMemberRepository crewMemberRepository;
    private CrewMeetupRepository crewMeetupRepository;
    private MeetupParticipantRepository meetupParticipantRepository;
    private GymRepository gymRepository;
    private MediaAssetRepository mediaAssetRepository;
    private MediaImageVariantRepository mediaImageVariantRepository;
    private CrewService service;

    @BeforeEach
    void setUp() {
        crewRepository = mock(CrewRepository.class);
        crewJoinRequestRepository = mock(CrewJoinRequestRepository.class);
        crewMemberRepository = mock(CrewMemberRepository.class);
        crewMeetupRepository = mock(CrewMeetupRepository.class);
        meetupParticipantRepository = mock(MeetupParticipantRepository.class);
        gymRepository = mock(GymRepository.class);
        mediaAssetRepository = mock(MediaAssetRepository.class);
        mediaImageVariantRepository = mock(MediaImageVariantRepository.class);
        service = new CrewService(
                crewRepository,
                crewJoinRequestRepository,
                crewMemberRepository,
                crewMeetupRepository,
                meetupParticipantRepository,
                gymRepository,
                mediaAssetRepository,
                mediaImageVariantRepository,
                new AppProperties("Crimp", "test", null, new AppProperties.Media(null, 300)));
    }

    @Test
    void create_persistsCrewAndOwnerMember() {
        when(crewRepository.existsByName("강남 퇴근볼더")).thenReturn(false);
        when(crewRepository.countByOwnerUserIdAndDeletedAtIsNull(7L)).thenReturn(0L);
        when(crewRepository.save(any(Crew.class))).thenAnswer(invocation -> {
            Crew crew = invocation.getArgument(0);
            setField(crew, "id", 55L);
            return crew;
        });
        when(crewRepository.findPublicDetail(any(), eq(7L)))
                .thenReturn(Optional.of(row(55L, "01JCREW", CrewMemberRole.OWNER, CrewMemberStatus.ACTIVE, null)));

        CrewView view = service.create(7L, new CreateCrewCommand(
                " 강남 퇴근볼더 ", "평일 저녁", "V3~V6 중심", "서울 강남",
                null, null, "INTERMEDIATE", "BOULDERING", 30));

        assertThat(view.name()).isEqualTo("강남 퇴근볼더");
        verify(crewRepository).save(any(Crew.class));
        verify(crewMemberRepository).save(any(CrewMember.class));
    }

    @Test
    void create_resolvesActiveHomeGym() {
        when(gymRepository.findByExtIdAndStatus("01JGYM00000000000000000000", GymStatus.ACTIVE))
                .thenReturn(Optional.of(gym(33L, "01JGYM00000000000000000000")));
        when(crewRepository.existsByName("강남 퇴근볼더")).thenReturn(false);
        when(crewRepository.countByOwnerUserIdAndDeletedAtIsNull(7L)).thenReturn(0L);
        when(crewRepository.save(any(Crew.class))).thenAnswer(invocation -> {
            Crew crew = invocation.getArgument(0);
            setField(crew, "id", 55L);
            return crew;
        });
        when(crewRepository.findPublicDetail(any(), eq(7L)))
                .thenReturn(Optional.of(row(55L, "01JCREW", CrewMemberRole.OWNER, CrewMemberStatus.ACTIVE, null)));

        service.create(7L, new CreateCrewCommand(
                "강남 퇴근볼더", null, null, null,
                "01JGYM00000000000000000000", null, null, null, null));

        verify(crewRepository).save(org.mockito.ArgumentMatchers.argThat(crew -> crew.getHomeGymId().equals(33L)));
    }

    @Test
    void create_rejectsInactiveOrMissingHomeGym() {
        when(gymRepository.findByExtIdAndStatus("01JGYM00000000000000000000", GymStatus.ACTIVE))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(7L, new CreateCrewCommand(
                "강남 퇴근볼더", null, null, null,
                "01JGYM00000000000000000000", null, null, null, null)))
                .isInstanceOf(CrewException.class)
                .satisfies(e -> assertThat(((CrewException) e).code()).isEqualTo("CREW_HOME_GYM_NOT_FOUND"));
    }

    @Test
    void create_rejectsDuplicateName() {
        when(crewRepository.existsByName("강남 퇴근볼더")).thenReturn(true);

        assertThatThrownBy(() -> service.create(7L, new CreateCrewCommand(
                "강남 퇴근볼더", null, null, null, null, null, null, null, null)))
                .isInstanceOf(CrewException.class)
                .satisfies(e -> assertThat(((CrewException) e).code()).isEqualTo("CREW_NAME_TAKEN"));
    }

    @Test
    void update_requiresOwnerOrAdminAndAppliesFields() {
        Crew crew = crew(55L, "01JCREW", 7L, null, "기존 크루");
        when(crewRepository.findByExtId("01JCREW")).thenReturn(Optional.of(crew));
        when(crewMemberRepository.findByCrewIdAndUserIdAndStatus(55L, 7L, CrewMemberStatus.ACTIVE))
                .thenReturn(Optional.of(CrewMember.create(55L, 7L, CrewMemberRole.OWNER, CrewMemberStatus.ACTIVE)));
        when(crewRepository.existsByName("새 크루")).thenReturn(false);
        when(crewRepository.findPublicDetail("01JCREW", 7L))
                .thenReturn(Optional.of(row(55L, "01JCREW", CrewMemberRole.OWNER, CrewMemberStatus.ACTIVE, null)));

        service.update(7L, "01JCREW", new UpdateCrewCommand(
                null, "새 요약", null, null, null, false,
                null, false, "ADVANCED", "LEAD", null, true));

        assertThat(crew.getName()).isEqualTo("기존 크루");
        assertThat(crew.getSummary()).isEqualTo("새 요약");
        assertThat(crew.getLevelBand()).isEqualTo(CrewLevelBand.ADVANCED);
        assertThat(crew.getStyle()).isEqualTo(CrewStyle.LEAD);
        assertThat(crew.getCapacity()).isNull();
    }

    @Test
    void update_forbiddenForNonAdminMember() {
        Crew crew = crew(55L, "01JCREW", 7L, null, "기존 크루");
        when(crewRepository.findByExtId("01JCREW")).thenReturn(Optional.of(crew));
        when(crewMemberRepository.findByCrewIdAndUserIdAndStatus(55L, 8L, CrewMemberStatus.ACTIVE))
                .thenReturn(Optional.of(CrewMember.create(55L, 8L, CrewMemberRole.MEMBER, CrewMemberStatus.ACTIVE)));

        assertThatThrownBy(() -> service.update(8L, "01JCREW", new UpdateCrewCommand(
                "새 크루", null, null, null, null, false, null, false, null, null, null, false)))
                .isInstanceOf(CrewException.class)
                .satisfies(e -> assertThat(((CrewException) e).code()).isEqualTo("CREW_FORBIDDEN"));
    }

    @Test
    void update_rejectsClearCapacityWithCapacity() {
        Crew crew = crew(55L, "01JCREW", 7L, null, "기존 크루");
        when(crewRepository.findByExtId("01JCREW")).thenReturn(Optional.of(crew));
        when(crewMemberRepository.findByCrewIdAndUserIdAndStatus(55L, 7L, CrewMemberStatus.ACTIVE))
                .thenReturn(Optional.of(CrewMember.create(55L, 7L, CrewMemberRole.OWNER, CrewMemberStatus.ACTIVE)));

        assertThatThrownBy(() -> service.update(7L, "01JCREW", new UpdateCrewCommand(
                null, null, null, null, null, false, null, false, null, null, 20, true)))
                .isInstanceOf(CrewException.class)
                .satisfies(e -> assertThat(((CrewException) e).code()).isEqualTo("INVALID_CREW_REQUEST"));
    }

    @Test
    void requestJoin_createsPendingRequest() {
        Crew crew = crew(55L, "01JCREW", 7L, null, "기존 크루");
        when(crewRepository.findByExtIdForUpdate("01JCREW")).thenReturn(Optional.of(crew));
        when(crewMemberRepository.existsByCrewIdAndUserIdAndStatus(55L, 8L, CrewMemberStatus.ACTIVE))
                .thenReturn(false);
        when(crewJoinRequestRepository.existsByCrewIdAndUserIdAndStatus(55L, 8L, CrewJoinRequestStatus.PENDING))
                .thenReturn(false);
        when(crewJoinRequestRepository.saveAndFlush(any(CrewJoinRequest.class))).thenAnswer(invocation -> {
            CrewJoinRequest request = invocation.getArgument(0);
            setField(request, "id", 90L);
            setField(request, "extId", "01JREQ");
            return request;
        });
        when(crewJoinRequestRepository.findRowByExtId(any()))
                .thenReturn(Optional.of(requestRow(90L, "01JREQ", CrewJoinRequestStatus.PENDING)));

        CrewJoinRequestView view = service.requestJoin(8L, "01JCREW",
                new CreateCrewJoinRequestCommand(" 가입하고 싶어요 "));

        assertThat(view.extId()).isEqualTo("01JREQ");
        assertThat(view.status()).isEqualTo(CrewJoinRequestStatus.PENDING);
        verify(crewJoinRequestRepository).saveAndFlush(org.mockito.ArgumentMatchers.argThat(
                request -> request.getMessage().equals("가입하고 싶어요")));
    }

    @Test
    void requestJoin_rejectsExistingMember() {
        Crew crew = crew(55L, "01JCREW", 7L, null, "기존 크루");
        when(crewRepository.findByExtIdForUpdate("01JCREW")).thenReturn(Optional.of(crew));
        when(crewMemberRepository.existsByCrewIdAndUserIdAndStatus(55L, 8L, CrewMemberStatus.ACTIVE))
                .thenReturn(true);

        assertThatThrownBy(() -> service.requestJoin(8L, "01JCREW",
                new CreateCrewJoinRequestCommand(null)))
                .isInstanceOf(CrewException.class)
                .satisfies(e -> assertThat(((CrewException) e).code()).isEqualTo("CREW_ALREADY_MEMBER"));
    }

    @Test
    void requestJoin_allowsLeftMemberToRequestAgain() {
        Crew crew = crew(55L, "01JCREW", 7L, null, "기존 크루");
        when(crewRepository.findByExtIdForUpdate("01JCREW")).thenReturn(Optional.of(crew));
        when(crewMemberRepository.existsByCrewIdAndUserIdAndStatus(55L, 8L, CrewMemberStatus.ACTIVE))
                .thenReturn(false);
        when(crewJoinRequestRepository.existsByCrewIdAndUserIdAndStatus(55L, 8L, CrewJoinRequestStatus.PENDING))
                .thenReturn(false);
        when(crewJoinRequestRepository.saveAndFlush(any(CrewJoinRequest.class))).thenAnswer(invocation -> {
            CrewJoinRequest request = invocation.getArgument(0);
            setField(request, "id", 92L);
            setField(request, "extId", "01JREQ3");
            return request;
        });
        when(crewJoinRequestRepository.findRowByExtId(any()))
                .thenReturn(Optional.of(requestRow(92L, "01JREQ3", CrewJoinRequestStatus.PENDING)));

        CrewJoinRequestView view = service.requestJoin(8L, "01JCREW",
                new CreateCrewJoinRequestCommand(null));

        assertThat(view.status()).isEqualTo(CrewJoinRequestStatus.PENDING);
        verify(crewMemberRepository).existsByCrewIdAndUserIdAndStatus(
                55L, 8L, CrewMemberStatus.ACTIVE);
    }

    @Test
    void requestJoin_rejectsDuplicatePendingRequestInSameCrew() {
        Crew crew = crew(55L, "01JCREW", 7L, null, "기존 크루");
        when(crewRepository.findByExtIdForUpdate("01JCREW")).thenReturn(Optional.of(crew));
        when(crewMemberRepository.existsByCrewIdAndUserIdAndStatus(55L, 8L, CrewMemberStatus.ACTIVE))
                .thenReturn(false);
        when(crewJoinRequestRepository.existsByCrewIdAndUserIdAndStatus(55L, 8L, CrewJoinRequestStatus.PENDING))
                .thenReturn(true);

        assertThatThrownBy(() -> service.requestJoin(8L, "01JCREW",
                new CreateCrewJoinRequestCommand(null)))
                .isInstanceOf(CrewException.class)
                .satisfies(e -> assertThat(((CrewException) e).code()).isEqualTo("CREW_JOIN_REQUEST_PENDING"));
    }

    @Test
    void requestJoin_checksPendingRequestWithinRequestedCrewOnly() {
        Crew crew = crew(66L, "01JCREW2", 7L, null, "다른 크루");
        when(crewRepository.findByExtIdForUpdate("01JCREW2")).thenReturn(Optional.of(crew));
        when(crewMemberRepository.existsByCrewIdAndUserIdAndStatus(66L, 8L, CrewMemberStatus.ACTIVE))
                .thenReturn(false);
        when(crewJoinRequestRepository.existsByCrewIdAndUserIdAndStatus(66L, 8L, CrewJoinRequestStatus.PENDING))
                .thenReturn(false);
        when(crewJoinRequestRepository.saveAndFlush(any(CrewJoinRequest.class))).thenAnswer(invocation -> {
            CrewJoinRequest request = invocation.getArgument(0);
            setField(request, "id", 91L);
            setField(request, "extId", "01JREQ2");
            return request;
        });
        when(crewJoinRequestRepository.findRowByExtId(any()))
                .thenReturn(Optional.of(requestRow(91L, "01JREQ2", CrewJoinRequestStatus.PENDING)));

        service.requestJoin(8L, "01JCREW2", new CreateCrewJoinRequestCommand(null));

        verify(crewJoinRequestRepository)
                .existsByCrewIdAndUserIdAndStatus(66L, 8L, CrewJoinRequestStatus.PENDING);
    }

    @Test
    void approveJoinRequest_addsMemberAndApprovesRequest() {
        Crew crew = crew(55L, "01JCREW", 7L, null, "기존 크루");
        CrewJoinRequest request = CrewJoinRequest.builder()
                .extId("01JREQ")
                .crewId(55L)
                .userId(8L)
                .message("가입하고 싶어요")
                .build();
        when(crewRepository.findByExtIdForUpdate("01JCREW")).thenReturn(Optional.of(crew));
        when(crewMemberRepository.findByCrewIdAndUserIdAndStatus(55L, 7L, CrewMemberStatus.ACTIVE))
                .thenReturn(Optional.of(CrewMember.create(55L, 7L, CrewMemberRole.OWNER, CrewMemberStatus.ACTIVE)));
        when(crewJoinRequestRepository.findByCrewIdAndExtIdAndStatus(55L, "01JREQ", CrewJoinRequestStatus.PENDING))
                .thenReturn(Optional.of(request));
        when(crewMemberRepository.existsByCrewIdAndUserIdAndStatus(55L, 8L, CrewMemberStatus.ACTIVE))
                .thenReturn(false);
        when(crewMemberRepository.findByCrewIdAndUserId(55L, 8L)).thenReturn(Optional.empty());
        when(crewJoinRequestRepository.findRowByExtId("01JREQ"))
                .thenReturn(Optional.of(requestRow(90L, "01JREQ", CrewJoinRequestStatus.APPROVED)));

        CrewJoinRequestView view = service.approveJoinRequest(7L, "01JCREW", "01JREQ");

        assertThat(view.status()).isEqualTo(CrewJoinRequestStatus.APPROVED);
        assertThat(request.getStatus()).isEqualTo(CrewJoinRequestStatus.APPROVED);
        assertThat(crew.getMemberCount()).isEqualTo(2);
        verify(crewMemberRepository).save(any(CrewMember.class));
    }

    @Test
    void approveJoinRequest_reactivatesLeftMember() {
        Crew crew = crew(55L, "01JCREW", 7L, null, "기존 크루");
        CrewMember leftMember = CrewMember.create(55L, 8L, CrewMemberRole.MEMBER, CrewMemberStatus.LEFT);
        CrewJoinRequest request = CrewJoinRequest.builder()
                .extId("01JREQ")
                .crewId(55L)
                .userId(8L)
                .build();
        when(crewRepository.findByExtIdForUpdate("01JCREW")).thenReturn(Optional.of(crew));
        when(crewMemberRepository.findByCrewIdAndUserIdAndStatus(55L, 7L, CrewMemberStatus.ACTIVE))
                .thenReturn(Optional.of(CrewMember.create(55L, 7L, CrewMemberRole.OWNER, CrewMemberStatus.ACTIVE)));
        when(crewJoinRequestRepository.findByCrewIdAndExtIdAndStatus(55L, "01JREQ", CrewJoinRequestStatus.PENDING))
                .thenReturn(Optional.of(request));
        when(crewMemberRepository.existsByCrewIdAndUserIdAndStatus(55L, 8L, CrewMemberStatus.ACTIVE))
                .thenReturn(false);
        when(crewMemberRepository.findByCrewIdAndUserId(55L, 8L)).thenReturn(Optional.of(leftMember));
        when(crewJoinRequestRepository.findRowByExtId("01JREQ"))
                .thenReturn(Optional.of(requestRow(90L, "01JREQ", CrewJoinRequestStatus.APPROVED)));

        service.approveJoinRequest(7L, "01JCREW", "01JREQ");

        assertThat(leftMember.getStatus()).isEqualTo(CrewMemberStatus.ACTIVE);
        assertThat(leftMember.getRole()).isEqualTo(CrewMemberRole.MEMBER);
    }

    @Test
    void approveJoinRequest_rejectsFullCapacityBeforeAddingMember() {
        Crew crew = crew(55L, "01JCREW", 7L, null, "기존 크루");
        crew.updateBasic(crew.getName(), crew.getSummary(), crew.getDescription(), crew.getRegion(),
                crew.getHomeGymId(), crew.getImageMediaId(), crew.getLevelBand(), crew.getStyle(), (short) 1);
        CrewJoinRequest request = CrewJoinRequest.builder()
                .extId("01JREQ")
                .crewId(55L)
                .userId(8L)
                .build();
        when(crewRepository.findByExtIdForUpdate("01JCREW")).thenReturn(Optional.of(crew));
        when(crewMemberRepository.findByCrewIdAndUserIdAndStatus(55L, 7L, CrewMemberStatus.ACTIVE))
                .thenReturn(Optional.of(CrewMember.create(55L, 7L, CrewMemberRole.OWNER, CrewMemberStatus.ACTIVE)));
        when(crewJoinRequestRepository.findByCrewIdAndExtIdAndStatus(55L, "01JREQ", CrewJoinRequestStatus.PENDING))
                .thenReturn(Optional.of(request));
        when(crewMemberRepository.existsByCrewIdAndUserIdAndStatus(55L, 8L, CrewMemberStatus.ACTIVE))
                .thenReturn(false);

        assertThatThrownBy(() -> service.approveJoinRequest(7L, "01JCREW", "01JREQ"))
                .isInstanceOf(CrewException.class)
                .satisfies(e -> assertThat(((CrewException) e).code()).isEqualTo("CREW_CAPACITY_FULL"));
    }

    @Test
    void listJoinRequests_requiresAdminAndMapsRows() {
        Crew crew = crew(55L, "01JCREW", 7L, null, "기존 크루");
        when(crewRepository.findByExtId("01JCREW")).thenReturn(Optional.of(crew));
        when(crewMemberRepository.findByCrewIdAndUserIdAndStatus(55L, 7L, CrewMemberStatus.ACTIVE))
                .thenReturn(Optional.of(CrewMember.create(55L, 7L, CrewMemberRole.ADMIN, CrewMemberStatus.ACTIVE)));
        when(crewJoinRequestRepository.searchByCrew(eq(55L), eq(CrewJoinRequestStatus.PENDING), eq(null), any()))
                .thenReturn(new SliceImpl<>(List.of(requestRow(90L, "01JREQ", CrewJoinRequestStatus.PENDING)),
                        Pageable.ofSize(20), false));

        var result = service.listJoinRequests(7L, "01JCREW", null, null, 20);

        assertThat(result.items()).hasSize(1);
        assertThat(result.items().get(0).userExtId()).isEqualTo("01JUSER");
        assertThat(result.size()).isEqualTo(20);
    }

    @Test
    void listMembers_mapsActiveMembers() {
        Crew crew = crew(55L, "01JCREW", 7L, null, "기존 크루");
        when(crewRepository.findByExtId("01JCREW")).thenReturn(Optional.of(crew));
        when(crewMemberRepository.searchActiveByCrew(eq(55L), eq(null), any()))
                .thenReturn(new SliceImpl<>(List.of(memberRow(55L, "01JCREW", 8L, "01JUSER", CrewMemberRole.MEMBER)),
                        Pageable.ofSize(20), false));

        var result = service.listMembers(7L, "01JCREW", null, 20);

        assertThat(result.items()).hasSize(1);
        assertThat(result.items().get(0).userExtId()).isEqualTo("01JUSER");
        assertThat(result.items().get(0).role()).isEqualTo(CrewMemberRole.MEMBER);
        assertThat(result.size()).isEqualTo(20);
    }

    @Test
    void createMeetup_rejectsPastStart() {
        assertThatThrownBy(() -> service.createMeetup(7L, null, new CreateCrewMeetupCommand(
                "퇴근 볼더링", null,
                Instant.now().minusSeconds(120), null,
                null, "강남", 8, "OPEN")))
                .isInstanceOf(CrewException.class)
                .satisfies(e -> assertThat(((CrewException) e).code()).isEqualTo("INVALID_CREW_MEETUP_REQUEST"));
    }

    @Test
    void listAllMeetups_queriesUpcomingOnly() {
        CrewMeetup meetup = CrewMeetup.builder()
                .extId("01JMEETUP")
                .createdBy(7L)
                .title("퇴근 볼더링")
                .startsAt(Instant.now().plusSeconds(3600))
                .location("강남")
                .capacity((short) 8)
                .build();
        when(crewMeetupRepository.findByDeletedAtIsNullAndStartsAtGreaterThanEqualOrderByStartsAtAscIdAsc(
                any(Instant.class), any(Pageable.class)))
                .thenReturn(List.of(meetup));
        when(meetupParticipantRepository.countByMeetupIdAndStatus(any(), any())).thenReturn(0L);
        when(meetupParticipantRepository.existsByMeetupIdAndUserIdAndStatus(any(), any(), any())).thenReturn(false);

        List<CrewMeetupView> result = service.listAllMeetups(7L, 10);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).extId()).isEqualTo("01JMEETUP");
        verify(crewMeetupRepository).findByDeletedAtIsNullAndStartsAtGreaterThanEqualOrderByStartsAtAscIdAsc(
                any(Instant.class), any(Pageable.class));
    }

    @Test
    void leaveCrew_marksMemberLeftAndDecrementsMemberCount() {
        Crew crew = crew(55L, "01JCREW", 7L, null, "기존 크루");
        CrewMember member = CrewMember.create(55L, 8L, CrewMemberRole.MEMBER, CrewMemberStatus.ACTIVE);
        when(crewRepository.findByExtIdForUpdate("01JCREW")).thenReturn(Optional.of(crew));
        when(crewMemberRepository.findByCrewIdAndUserIdAndStatus(55L, 8L, CrewMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));

        service.leaveCrew(8L, "01JCREW");

        assertThat(member.getStatus()).isEqualTo(CrewMemberStatus.LEFT);
        assertThat(crew.getMemberCount()).isEqualTo(0);
    }

    @Test
    void leaveCrew_isScopedToRequestedCrew() {
        Crew crew = crew(55L, "01JCREW", 7L, null, "기존 크루");
        CrewMember member = CrewMember.create(55L, 8L, CrewMemberRole.MEMBER, CrewMemberStatus.ACTIVE);
        when(crewRepository.findByExtIdForUpdate("01JCREW")).thenReturn(Optional.of(crew));
        when(crewMemberRepository.findByCrewIdAndUserIdAndStatus(55L, 8L, CrewMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));

        service.leaveCrew(8L, "01JCREW");

        verify(crewMemberRepository).findByCrewIdAndUserIdAndStatus(55L, 8L, CrewMemberStatus.ACTIVE);
    }

    @Test
    void leaveCrew_blocksLastOwner() {
        Crew crew = crew(55L, "01JCREW", 7L, null, "기존 크루");
        CrewMember member = CrewMember.create(55L, 7L, CrewMemberRole.OWNER, CrewMemberStatus.ACTIVE);
        when(crewRepository.findByExtIdForUpdate("01JCREW")).thenReturn(Optional.of(crew));
        when(crewMemberRepository.findByCrewIdAndUserIdAndStatus(55L, 7L, CrewMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));
        when(crewMemberRepository.countByCrewIdAndRoleAndStatus(55L, CrewMemberRole.OWNER, CrewMemberStatus.ACTIVE))
                .thenReturn(1L);

        assertThatThrownBy(() -> service.leaveCrew(7L, "01JCREW"))
                .isInstanceOf(CrewException.class)
                .satisfies(e -> assertThat(((CrewException) e).code()).isEqualTo("CREW_OWNER_LEAVE_BLOCKED"));
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
                null,
                CrewLevelBand.INTERMEDIATE,
                CrewStyle.BOULDERING,
                CrewJoinPolicy.APPROVAL,
                (short) 30,
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

    private static CrewJoinRequestRow requestRow(Long id, String extId, CrewJoinRequestStatus status) {
        return new CrewJoinRequestRow(
                id,
                extId,
                55L,
                "01JCREW",
                8L,
                "01JUSER",
                "신청자",
                "가입하고 싶어요",
                status,
                null,
                null,
                Instant.parse("2026-05-08T00:00:00Z"));
    }

    private static CrewMemberRow memberRow(Long crewId, String crewExtId, Long userId, String userExtId,
                                           CrewMemberRole role) {
        return new CrewMemberRow(
                crewId,
                crewExtId,
                userId,
                userExtId,
                "멤버",
                role,
                CrewMemberStatus.ACTIVE,
                Instant.parse("2026-05-08T00:00:00Z"));
    }

    private static Crew crew(Long id, String extId, Long ownerUserId, Long homeGymId, String name) {
        Crew crew = Crew.builder()
                .extId(extId)
                .ownerUserId(ownerUserId)
                .homeGymId(homeGymId)
                .name(name)
                .summary("기존 요약")
                .description("기존 설명")
                .region("서울 강남")
                .levelBand(CrewLevelBand.INTERMEDIATE)
                .style(CrewStyle.BOULDERING)
                .capacity((short) 30)
                .build();
        setField(crew, "id", id);
        return crew;
    }

    @SuppressWarnings("unused")
    private static Gym gym(Long id, String extId) {
        Gym gym = Gym.create(extId, "더클라임 강남점", "서울 강남구",
                new BigDecimal("37.5000000"), new BigDecimal("127.0000000"));
        setField(gym, "id", id);
        return gym;
    }

    private static void setField(Object target, String name, Object value) {
        try {
            Class<?> c = target.getClass();
            while (c != null) {
                try {
                    Field f = c.getDeclaredField(name);
                    f.setAccessible(true);
                    f.set(target, value);
                    return;
                } catch (NoSuchFieldException e) {
                    c = c.getSuperclass();
                }
            }
            throw new IllegalStateException("no field: " + name);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
