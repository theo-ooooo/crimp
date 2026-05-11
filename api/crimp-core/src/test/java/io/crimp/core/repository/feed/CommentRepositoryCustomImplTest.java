package io.crimp.core.repository.feed;

import io.crimp.core.config.QueryDslConfig;
import io.crimp.core.entity.feed.Comment;
import io.crimp.core.entity.feed.FeedPost;
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

import static io.crimp.core.entity.enums.PostVisibility.PUBLIC;
import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ContextConfiguration(classes = CommentRepositoryCustomImplTest.TestApp.class)
@TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class CommentRepositoryCustomImplTest {

    @PersistenceContext
    private EntityManager em;

    @jakarta.annotation.Resource
    private CommentRepository commentRepository;

    @Test
    void listByPost_marksCommentsWrittenByDeletedUser() {
        User activeUser = persistUser("01HACTIVE0000000000000001");
        User deletedUser = persistUser("01HDELETED00000000000001");
        deletedUser.deleteAccount();
        em.persist(Profile.create(activeUser.getId(), "active"));
        em.persist(Profile.create(deletedUser.getId(), "deleted"));

        FeedPost post = FeedPost.create("01HPOST000000000000000001", activeUser.getId(), "post", null, null, PUBLIC);
        em.persist(post);
        em.flush();

        em.persist(Comment.create("01HCOMMENT00000000000001", post.getId(), activeUser.getId(), null, "visible"));
        em.persist(Comment.create("01HCOMMENT00000000000002", post.getId(), deletedUser.getId(), null, "hidden"));
        em.flush();
        em.clear();

        var rows = commentRepository.listByPost(post.getId(), null, PageRequest.of(0, 20));

        assertThat(rows.getContent())
                .extracting(row -> row.userExtId().trim())
                .containsExactly(
                        "01HACTIVE0000000000000001",
                        "01HDELETED00000000000001");
        assertThat(rows.getContent())
                .extracting(CommentRow::userNickname)
                .containsExactly("active", "deleted");
        assertThat(rows.getContent())
                .extracting(CommentRow::userDeleted)
                .containsExactly(false, true);
    }

    private User persistUser(String extId) {
        User user = User.create(extId, null, null);
        em.persist(user);
        em.flush();
        return user;
    }

    @SpringBootApplication
    @EntityScan(basePackageClasses = {User.class, Profile.class, FeedPost.class, Comment.class})
    @EnableJpaRepositories(basePackageClasses = CommentRepository.class)
    @Import(QueryDslConfig.class)
    static class TestApp {
    }
}
