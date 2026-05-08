package io.crimp.core.repository.crew;

import io.crimp.core.config.QueryDslConfig;
import io.crimp.core.entity.crew.Crew;
import io.crimp.core.entity.crew.CrewJoinRequest;
import io.crimp.core.entity.crew.CrewMember;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.entity.user.Profile;
import io.crimp.core.entity.user.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;

import static io.crimp.core.entity.enums.CrewLevelBand.INTERMEDIATE;
import static io.crimp.core.entity.enums.CrewMemberRole.OWNER;
import static io.crimp.core.entity.enums.CrewStyle.BOULDERING;
import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ContextConfiguration(classes = CrewRepositoryImplTest.TestApp.class)
@TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class CrewRepositoryImplTest {

    @PersistenceContext
    private EntityManager em;

    @jakarta.annotation.Resource
    private CrewRepository crewRepository;

    @jakarta.annotation.Resource
    private CrewJoinRequestRepository crewJoinRequestRepository;

    @Test
    void searchPublic_mapsHomeGymOwnerAndMemberStatus() {
        User owner = persistUser("01JOWNER0000000000000001", "owner");
        User viewer = persistUser("01JVIEWER000000000000001", "viewer");
        Gym gym = persistGym("01JGYM000000000000000001", "더클라임 강남점");
        Crew crew = persistCrew("01JCREW00000000000000001", owner.getId(), gym.getId(), "강남 퇴근볼더");
        em.persist(CrewMember.builder()
                .crewId(crew.getId())
                .userId(viewer.getId())
                .role(OWNER)
                .build());
        em.flush();
        em.clear();

        var result = crewRepository.searchPublic(null, "강남", "서울", "01JGYM000000000000000001",
                INTERMEDIATE, BOULDERING, viewer.getId(), PageRequest.of(0, 20));

        assertThat(result.getContent()).hasSize(1);
        CrewSearchRow row = result.getContent().get(0);
        assertThat(row.extId().trim()).isEqualTo("01JCREW00000000000000001");
        assertThat(row.homeGymName()).isEqualTo("더클라임 강남점");
        assertThat(row.ownerNickname()).isEqualTo("owner");
        assertThat(row.myRole()).isEqualTo(io.crimp.core.entity.enums.CrewMemberRole.OWNER);
        assertThat(row.capacity()).isEqualTo((short) 30);
    }

    @Test
    void searchPublic_marksPendingRequestWhenViewerIsNotMember() {
        User owner = persistUser("01JOWNER0000000000000001", "owner");
        User viewer = persistUser("01JVIEWER000000000000001", "viewer");
        Crew crew = persistCrew("01JCREW00000000000000001", owner.getId(), null, "강남 퇴근볼더");
        em.persist(CrewJoinRequest.builder()
                .extId("01JREQ000000000000000001")
                .crewId(crew.getId())
                .userId(viewer.getId())
                .message("가입하고 싶어요")
                .build());
        em.flush();
        em.clear();

        var result = crewRepository.searchPublic(null, null, null, null,
                null, null, viewer.getId(), PageRequest.of(0, 20));

        assertThat(result.getContent()).hasSize(1);
        CrewSearchRow row = result.getContent().get(0);
        assertThat(row.myRole()).isNull();
        assertThat(row.pendingRequestExtId().trim()).isEqualTo("01JREQ000000000000000001");
    }

    @Test
    void searchJoinRequests_mapsApplicantAndDeciderExtId() {
        User owner = persistUser("01JOWNER0000000000000001", "owner");
        User applicant = persistUser("01JUSER00000000000000001", "applicant");
        Crew crew = persistCrew("01JCREW00000000000000001", owner.getId(), null, "강남 퇴근볼더");
        CrewJoinRequest request = CrewJoinRequest.builder()
                .extId("01JREQ000000000000000001")
                .crewId(crew.getId())
                .userId(applicant.getId())
                .message("가입하고 싶어요")
                .build();
        request.approve(owner.getId());
        em.persist(request);
        em.flush();
        em.clear();

        var result = crewJoinRequestRepository.searchByCrew(
                crew.getId(), io.crimp.core.entity.enums.CrewJoinRequestStatus.APPROVED, null, PageRequest.of(0, 20));

        assertThat(result.getContent()).hasSize(1);
        CrewJoinRequestRow row = result.getContent().get(0);
        assertThat(row.extId().trim()).isEqualTo("01JREQ000000000000000001");
        assertThat(row.userExtId().trim()).isEqualTo("01JUSER00000000000000001");
        assertThat(row.userNickname()).isEqualTo("applicant");
        assertThat(row.decidedByExtId().trim()).isEqualTo("01JOWNER0000000000000001");
    }

    private User persistUser(String extId, String nickname) {
        User user = User.create(extId, null, null);
        em.persist(user);
        em.flush();
        em.persist(Profile.create(user.getId(), nickname));
        return user;
    }

    private Gym persistGym(String extId, String name) {
        Gym gym = Gym.create(extId, name, "서울 강남구", new BigDecimal("37.5000000"), new BigDecimal("127.0000000"));
        em.persist(gym);
        em.flush();
        return gym;
    }

    private Crew persistCrew(String extId, Long ownerUserId, Long homeGymId, String name) {
        Crew crew = Crew.builder()
                .extId(extId)
                .ownerUserId(ownerUserId)
                .homeGymId(homeGymId)
                .name(name)
                .summary("평일 저녁")
                .description("V3~V6 중심")
                .region("서울 강남")
                .levelBand(INTERMEDIATE)
                .style(BOULDERING)
                .capacity((short) 30)
                .build();
        em.persist(crew);
        em.flush();
        return crew;
    }

    @SpringBootApplication
    @EntityScan(basePackageClasses = {Crew.class, CrewMember.class, CrewJoinRequest.class, Gym.class, User.class, Profile.class})
    @EnableJpaRepositories(basePackageClasses = CrewRepository.class)
    @Import(QueryDslConfig.class)
    static class TestApp {
    }
}
