package io.crimp.domain.crew;

import io.crimp.core.entity.crew.Crew;
import io.crimp.core.entity.crew.CrewMember;
import io.crimp.core.entity.enums.CrewJoinPolicy;
import io.crimp.core.entity.enums.CrewLevelBand;
import io.crimp.core.entity.enums.CrewMemberRole;
import io.crimp.core.entity.enums.CrewMemberStatus;
import io.crimp.core.entity.enums.CrewStyle;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.repository.crew.CrewMemberRepository;
import io.crimp.core.repository.crew.CrewRepository;
import io.crimp.core.repository.crew.CrewSearchRow;
import io.crimp.core.repository.gym.GymRepository;
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
    private CrewMemberRepository crewMemberRepository;
    private GymRepository gymRepository;
    private CrewService service;

    @BeforeEach
    void setUp() {
        crewRepository = mock(CrewRepository.class);
        crewMemberRepository = mock(CrewMemberRepository.class);
        gymRepository = mock(GymRepository.class);
        service = new CrewService(crewRepository, crewMemberRepository, gymRepository);
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
                null, "INTERMEDIATE", "BOULDERING", 30));

        assertThat(view.name()).isEqualTo("강남 퇴근볼더");
        verify(crewRepository).save(any(Crew.class));
        verify(crewMemberRepository).save(any(CrewMember.class));
    }

    @Test
    void create_rejectsDuplicateName() {
        when(crewRepository.existsByName("강남 퇴근볼더")).thenReturn(true);

        assertThatThrownBy(() -> service.create(7L, new CreateCrewCommand(
                "강남 퇴근볼더", null, null, null, null, null, null, null)))
                .isInstanceOf(CrewException.class)
                .satisfies(e -> assertThat(((CrewException) e).code()).isEqualTo("CREW_NAME_TAKEN"));
    }

    @Test
    void update_requiresOwnerOrAdminAndAppliesFields() {
        Crew crew = crew(55L, "01JCREW", 7L, null, "기존 크루");
        when(crewRepository.findByExtId("01JCREW")).thenReturn(Optional.of(crew));
        when(crewMemberRepository.findByCrewIdAndUserIdAndStatus(55L, 7L, CrewMemberStatus.ACTIVE))
                .thenReturn(Optional.of(CrewMember.builder()
                        .crewId(55L)
                        .userId(7L)
                        .role(CrewMemberRole.OWNER)
                        .build()));
        when(crewRepository.existsByName("새 크루")).thenReturn(false);
        when(crewRepository.findPublicDetail("01JCREW", 7L))
                .thenReturn(Optional.of(row(55L, "01JCREW", CrewMemberRole.OWNER, CrewMemberStatus.ACTIVE, null)));

        service.update(7L, "01JCREW", new UpdateCrewCommand(
                "새 크루", "새 요약", null, null, null, false,
                "ADVANCED", "LEAD", null, true));

        assertThat(crew.getName()).isEqualTo("새 크루");
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
                .thenReturn(Optional.of(CrewMember.builder()
                        .crewId(55L)
                        .userId(8L)
                        .role(CrewMemberRole.MEMBER)
                        .build()));

        assertThatThrownBy(() -> service.update(8L, "01JCREW", new UpdateCrewCommand(
                "새 크루", null, null, null, null, false, null, null, null, false)))
                .isInstanceOf(CrewException.class)
                .satisfies(e -> assertThat(((CrewException) e).code()).isEqualTo("CREW_FORBIDDEN"));
    }

    @Test
    void update_rejectsClearCapacityWithCapacity() {
        Crew crew = crew(55L, "01JCREW", 7L, null, "기존 크루");
        when(crewRepository.findByExtId("01JCREW")).thenReturn(Optional.of(crew));
        when(crewMemberRepository.findByCrewIdAndUserIdAndStatus(55L, 7L, CrewMemberStatus.ACTIVE))
                .thenReturn(Optional.of(CrewMember.builder()
                        .crewId(55L)
                        .userId(7L)
                        .role(CrewMemberRole.OWNER)
                        .build()));

        assertThatThrownBy(() -> service.update(7L, "01JCREW", new UpdateCrewCommand(
                null, null, null, null, null, false, null, null, 20, true)))
                .isInstanceOf(CrewException.class)
                .satisfies(e -> assertThat(((CrewException) e).code()).isEqualTo("INVALID_CREW_REQUEST"));
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
