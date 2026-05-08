package io.crimp.domain.crew;

import io.crimp.core.entity.enums.CrewLevelBand;
import io.crimp.core.entity.enums.CrewMemberStatus;
import io.crimp.core.entity.enums.CrewStyle;
import io.crimp.core.repository.crew.CrewRepository;
import io.crimp.core.repository.crew.CrewSearchRow;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@org.springframework.context.annotation.Profile("!test")
public class CrewService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    private final CrewRepository crewRepository;

    public CrewService(CrewRepository crewRepository) {
        this.crewRepository = crewRepository;
    }

    @Transactional(readOnly = true)
    public CrewSearchResult search(Long viewerUserId, Long cursorId, String keyword, String region,
                                   String gymExtId, String levelBand, String style, Integer size) {
        int pageSize = capSize(size);
        CrewLevelBand parsedLevelBand = parseEnum(CrewLevelBand.class, levelBand, "INVALID_CREW_REQUEST");
        CrewStyle parsedStyle = parseEnum(CrewStyle.class, style, "INVALID_CREW_REQUEST");

        Slice<CrewSearchRow> slice = crewRepository.searchPublic(
                cursorId,
                blankToNull(keyword),
                blankToNull(region),
                blankToNull(gymExtId),
                parsedLevelBand,
                parsedStyle,
                viewerUserId,
                PageRequest.of(0, pageSize));

        List<CrewView> items = slice.getContent().stream().map(CrewService::toView).toList();
        Long nextCursor = slice.hasNext() && !slice.getContent().isEmpty()
                ? slice.getContent().get(slice.getContent().size() - 1).id()
                : null;
        return new CrewSearchResult(items, nextCursor, pageSize);
    }

    @Transactional(readOnly = true)
    public CrewView getByExtId(Long viewerUserId, String extId) {
        CrewSearchRow row = crewRepository.findPublicDetail(extId, viewerUserId)
                .orElseThrow(() -> new CrewException("CREW_NOT_FOUND", "Crew " + extId + " not found"));
        return toView(row);
    }

    private static CrewView toView(CrewSearchRow row) {
        CrewHomeGymView homeGym = row.homeGymExtId() == null
                ? null
                : new CrewHomeGymView(row.homeGymExtId(), row.homeGymName());
        CrewOwnerView owner = new CrewOwnerView(row.ownerUserExtId(), row.ownerNickname());
        return new CrewView(
                row.extId(),
                row.name(),
                row.summary(),
                row.description(),
                row.region(),
                homeGym,
                row.levelBand(),
                row.style(),
                row.memberCount() == null ? 0 : row.memberCount(),
                row.capacity() == null ? null : row.capacity().intValue(),
                row.joinPolicy(),
                myStatus(row),
                owner,
                row.createdAt());
    }

    private static String myStatus(CrewSearchRow row) {
        if (row.myMemberStatus() == CrewMemberStatus.ACTIVE && row.myRole() != null) {
            return row.myRole().name();
        }
        if (row.pendingRequestExtId() != null) {
            return "PENDING";
        }
        return "NONE";
    }

    private static int capSize(Integer size) {
        if (size == null || size <= 0) return DEFAULT_PAGE_SIZE;
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private static String blankToNull(String s) {
        if (s == null || s.trim().isEmpty()) return null;
        return s.trim();
    }

    private static <E extends Enum<E>> E parseEnum(Class<E> type, String raw, String code) {
        String v = blankToNull(raw);
        if (v == null) return null;
        try {
            return Enum.valueOf(type, v.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new CrewException(code, "Invalid " + type.getSimpleName() + ": " + raw);
        }
    }

    public record CrewSearchResult(List<CrewView> items, Long nextCursor, int size) {}
}
