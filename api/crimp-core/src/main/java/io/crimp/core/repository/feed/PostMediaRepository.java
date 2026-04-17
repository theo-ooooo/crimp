package io.crimp.core.repository.feed;

import io.crimp.core.entity.feed.PostMedia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostMediaRepository extends JpaRepository<PostMedia, PostMedia.PostMediaId> {
    List<PostMedia> findByIdPostIdOrderBySeq(Long postId);
}
