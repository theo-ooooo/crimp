package io.crimp.core.repository.social;

import io.crimp.core.entity.social.Follow;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FollowRepository extends JpaRepository<Follow, Follow.FollowId> {
    long countByIdFollowerId(Long followerId);
    long countByIdFolloweeId(Long followeeId);
    List<Follow> findByIdFollowerId(Long followerId);
}
