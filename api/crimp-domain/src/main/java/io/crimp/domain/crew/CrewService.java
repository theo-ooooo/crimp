package io.crimp.domain.crew;

import io.crimp.common.id.UlidGenerator;
import io.crimp.core.entity.crew.Crew;
import io.crimp.core.entity.crew.CrewJoinRequest;
import io.crimp.core.entity.crew.CrewMember;
import io.crimp.core.entity.enums.CrewJoinPolicy;
import io.crimp.core.entity.enums.CrewJoinRequestStatus;
import io.crimp.core.entity.enums.CrewMemberRole;
import io.crimp.core.entity.enums.CrewLevelBand;
import io.crimp.core.entity.enums.CrewMemberStatus;
import io.crimp.core.entity.enums.CrewStyle;
import io.crimp.core.entity.enums.GymStatus;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.repository.crew.CrewJoinRequestRepository;
import io.crimp.core.repository.crew.CrewJoinRequestRow;
import io.crimp.core.repository.crew.CrewMemberRepository;
import io.crimp.core.repository.crew.CrewRepository;
import io.crimp.core.repository.crew.CrewSearchRow;
import io.crimp.core.repository.gym.GymRepository;
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
    private static final int MAX_CREWS_PER_OWNER = 10;

    private final CrewRepository crewRepository;
    private final CrewJoinRequestRepository crewJoinRequestRepository;
    private final CrewMemberRepository crewMemberRepository;
    private final GymRepository gymRepository;

    public CrewService(CrewRepository crewRepository, CrewJoinRequestRepository crewJoinRequestRepository,
                       CrewMemberRepository crewMemberRepository,
                       GymRepository gymRepository) {
        this.crewRepository = crewRepository;
        this.crewJoinRequestRepository = crewJoinRequestRepository;
        this.crewMemberRepository = crewMemberRepository;
        this.gymRepository = gymRepository;
    }

    @Transactional
    public CrewView create(Long ownerUserId, CreateCrewCommand command) {
        String name = requireLength(command.name(), 2, 30, "INVALID_CREW_REQUEST", "Crew name must be 2-30 characters");
        String summary = trimOptional(command.summary(), 120, "summary");
        String description = trimOptional(command.description(), 500, "description");
        String region = trimOptional(command.region(), 50, "region");
        CrewLevelBand levelBand = parseEnum(CrewLevelBand.class, command.levelBand(), "INVALID_CREW_REQUEST");
        CrewStyle style = parseEnum(CrewStyle.class, command.style(), "INVALID_CREW_REQUEST");
        Short capacity = parseCapacity(command.capacity());
        Long homeGymId = resolveHomeGymId(command.homeGymExtId());

        if (crewRepository.existsByName(name)) {
            throw new CrewException("CREW_NAME_TAKEN", "Crew name already taken: " + name);
        }
        if (crewRepository.countByOwnerUserIdAndDeletedAtIsNull(ownerUserId) >= MAX_CREWS_PER_OWNER) {
            throw new CrewException("CREW_LIMIT_EXCEEDED", "Crew create limit exceeded for user " + ownerUserId);
        }

        Crew crew = Crew.builder()
                .extId(UlidGenerator.next())
                .ownerUserId(ownerUserId)
                .homeGymId(homeGymId)
                .name(name)
                .summary(summary)
                .description(description)
                .region(region)
                .levelBand(levelBand)
                .style(style)
                .capacity(capacity)
                .build();
        crewRepository.save(crew);
        crewMemberRepository.save(CrewMember.builder()
                .crewId(crew.getId())
                .userId(ownerUserId)
                .role(CrewMemberRole.OWNER)
                .build());
        crewRepository.flush();
        return getByExtId(ownerUserId, crew.getExtId());
    }

    @Transactional
    public CrewView update(Long actorUserId, String crewExtId, UpdateCrewCommand command) {
        Crew crew = crewRepository.findByExtId(crewExtId)
                .filter(c -> !c.isDeleted())
                .orElseThrow(() -> new CrewException("CREW_NOT_FOUND", "Crew " + crewExtId + " not found"));
        requireAdmin(crew.getId(), actorUserId);

        String name = command.name() == null
                ? crew.getName()
                : requireLength(command.name(), 2, 30, "INVALID_CREW_REQUEST", "Crew name must be 2-30 characters");
        if (!name.equals(crew.getName()) && crewRepository.existsByName(name)) {
            throw new CrewException("CREW_NAME_TAKEN", "Crew name already taken: " + name);
        }

        String summary = command.summary() == null ? crew.getSummary() : trimOptional(command.summary(), 120, "summary");
        String description = command.description() == null ? crew.getDescription() : trimOptional(command.description(), 500, "description");
        String region = command.region() == null ? crew.getRegion() : trimOptional(command.region(), 50, "region");
        CrewLevelBand levelBand = command.levelBand() == null
                ? crew.getLevelBand()
                : parseEnum(CrewLevelBand.class, command.levelBand(), "INVALID_CREW_REQUEST");
        CrewStyle style = command.style() == null
                ? crew.getStyle()
                : parseEnum(CrewStyle.class, command.style(), "INVALID_CREW_REQUEST");
        Short capacity = command.clearCapacity() ? null
                : command.capacity() == null ? crew.getCapacity() : parseCapacity(command.capacity());
        Long homeGymId = resolveUpdatedHomeGymId(command, crew);

        crew.updateBasic(name, summary, description, region, homeGymId, levelBand, style, capacity);
        crewRepository.flush();
        return getByExtId(actorUserId, crew.getExtId());
    }

    @Transactional
    public CrewJoinRequestView requestJoin(Long userId, String crewExtId, CreateCrewJoinRequestCommand command) {
        Crew crew = findActiveCrewForUpdate(crewExtId);
        if (crew.getJoinPolicy() != CrewJoinPolicy.APPROVAL) {
            throw new CrewException("CREW_FORBIDDEN", "Crew does not accept join requests");
        }
        if (crewMemberRepository.existsByCrewIdAndUserIdAndStatus(crew.getId(), userId, CrewMemberStatus.ACTIVE)) {
            throw new CrewException("CREW_ALREADY_MEMBER", "User is already a crew member");
        }
        if (crewJoinRequestRepository.existsByCrewIdAndUserIdAndStatus(crew.getId(), userId, CrewJoinRequestStatus.PENDING)) {
            throw new CrewException("CREW_JOIN_REQUEST_PENDING", "Crew join request already pending");
        }
        if (crew.isCapacityFull()) {
            throw new CrewException("CREW_CAPACITY_FULL", "Crew capacity is full");
        }

        CrewJoinRequest request = CrewJoinRequest.builder()
                .extId(UlidGenerator.next())
                .crewId(crew.getId())
                .userId(userId)
                .message(trimOptional(command == null ? null : command.message(), 500, "message"))
                .build();
        crewJoinRequestRepository.saveAndFlush(request);
        return getJoinRequestView(request.getExtId());
    }

    @Transactional
    public CrewJoinRequestView cancelMyJoinRequest(Long userId, String crewExtId) {
        Crew crew = findActiveCrew(crewExtId);
        CrewJoinRequest request = crewJoinRequestRepository
                .findByCrewIdAndUserIdAndStatus(crew.getId(), userId, CrewJoinRequestStatus.PENDING)
                .orElseThrow(() -> new CrewException("CREW_JOIN_REQUEST_NOT_FOUND", "Pending crew join request not found"));
        request.cancel(userId);
        crewJoinRequestRepository.flush();
        return getJoinRequestView(request.getExtId());
    }

    @Transactional(readOnly = true)
    public CrewJoinRequestSearchResult listJoinRequests(Long actorUserId, String crewExtId, String status,
                                                        Long cursorId, Integer size) {
        Crew crew = findActiveCrew(crewExtId);
        requireAdmin(crew.getId(), actorUserId);
        CrewJoinRequestStatus parsedStatus = status == null
                ? CrewJoinRequestStatus.PENDING
                : parseEnum(CrewJoinRequestStatus.class, status, "INVALID_CREW_REQUEST");
        int pageSize = capSize(size);
        Slice<CrewJoinRequestRow> slice = crewJoinRequestRepository.searchByCrew(
                crew.getId(), parsedStatus, cursorId, PageRequest.of(0, pageSize));
        List<CrewJoinRequestView> items = slice.getContent().stream().map(CrewService::toJoinRequestView).toList();
        Long nextCursor = slice.hasNext() && !slice.getContent().isEmpty()
                ? slice.getContent().get(slice.getContent().size() - 1).id()
                : null;
        return new CrewJoinRequestSearchResult(items, nextCursor, pageSize);
    }

    @Transactional
    public CrewJoinRequestView approveJoinRequest(Long actorUserId, String crewExtId, String requestExtId) {
        Crew crew = findActiveCrewForUpdate(crewExtId);
        requireAdmin(crew.getId(), actorUserId);
        CrewJoinRequest request = findPendingJoinRequestForUpdate(crew.getId(), requestExtId);
        if (crewMemberRepository.existsByCrewIdAndUserIdAndStatus(crew.getId(), request.getUserId(), CrewMemberStatus.ACTIVE)) {
            throw new CrewException("CREW_ALREADY_MEMBER", "User is already a crew member");
        }
        if (crew.isCapacityFull() || (crew.getCapacity() != null
                && crewMemberRepository.countByCrewIdAndStatus(crew.getId(), CrewMemberStatus.ACTIVE) >= crew.getCapacity())) {
            throw new CrewException("CREW_CAPACITY_FULL", "Crew capacity is full");
        }

        crewMemberRepository.save(CrewMember.builder()
                .crewId(crew.getId())
                .userId(request.getUserId())
                .role(CrewMemberRole.MEMBER)
                .build());
        crew.incrementMemberCount();
        request.approve(actorUserId);
        crewRepository.flush();
        return getJoinRequestView(request.getExtId());
    }

    @Transactional
    public CrewJoinRequestView rejectJoinRequest(Long actorUserId, String crewExtId, String requestExtId) {
        Crew crew = findActiveCrew(crewExtId);
        requireAdmin(crew.getId(), actorUserId);
        CrewJoinRequest request = findPendingJoinRequestForUpdate(crew.getId(), requestExtId);
        request.reject(actorUserId);
        crewJoinRequestRepository.flush();
        return getJoinRequestView(request.getExtId());
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

    private Crew findActiveCrew(String crewExtId) {
        return crewRepository.findByExtId(crewExtId)
                .filter(c -> !c.isDeleted())
                .orElseThrow(() -> new CrewException("CREW_NOT_FOUND", "Crew " + crewExtId + " not found"));
    }

    private Crew findActiveCrewForUpdate(String crewExtId) {
        return crewRepository.findByExtIdForUpdate(crewExtId)
                .filter(c -> !c.isDeleted())
                .orElseThrow(() -> new CrewException("CREW_NOT_FOUND", "Crew " + crewExtId + " not found"));
    }

    private CrewJoinRequest findPendingJoinRequestForUpdate(Long crewId, String requestExtId) {
        return crewJoinRequestRepository
                .findByCrewIdAndExtIdAndStatus(crewId, requestExtId, CrewJoinRequestStatus.PENDING)
                .orElseThrow(() -> new CrewException("CREW_JOIN_REQUEST_NOT_FOUND", "Pending crew join request not found"));
    }

    private CrewJoinRequestView getJoinRequestView(String requestExtId) {
        return crewJoinRequestRepository.findRowByExtId(requestExtId)
                .map(CrewService::toJoinRequestView)
                .orElseThrow(() -> new CrewException("CREW_JOIN_REQUEST_NOT_FOUND", "Crew join request not found"));
    }

    private Long resolveUpdatedHomeGymId(UpdateCrewCommand command, Crew crew) {
        if (command.clearHomeGym() && command.homeGymExtId() != null) {
            throw new CrewException("INVALID_CREW_REQUEST", "clearHomeGym cannot be combined with homeGymExtId");
        }
        if (command.clearCapacity() && command.capacity() != null) {
            throw new CrewException("INVALID_CREW_REQUEST", "clearCapacity cannot be combined with capacity");
        }
        if (command.clearHomeGym()) return null;
        if (command.homeGymExtId() != null) return resolveHomeGymId(command.homeGymExtId());
        return crew.getHomeGymId();
    }

    private Long resolveHomeGymId(String homeGymExtId) {
        String extId = blankToNull(homeGymExtId);
        if (extId == null) return null;
        Gym gym = gymRepository.findByExtIdAndStatus(extId, GymStatus.ACTIVE)
                .orElseThrow(() -> new CrewException("CREW_HOME_GYM_NOT_FOUND", "Home gym not found or inactive: " + extId));
        return gym.getId();
    }

    private void requireAdmin(Long crewId, Long actorUserId) {
        CrewMember member = crewMemberRepository.findByCrewIdAndUserIdAndStatus(crewId, actorUserId, CrewMemberStatus.ACTIVE)
                .orElseThrow(() -> new CrewException("CREW_FORBIDDEN", "Crew admin permission required"));
        if (member.getRole() != CrewMemberRole.OWNER && member.getRole() != CrewMemberRole.ADMIN) {
            throw new CrewException("CREW_FORBIDDEN", "Crew admin permission required");
        }
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

    private static CrewJoinRequestView toJoinRequestView(CrewJoinRequestRow row) {
        return new CrewJoinRequestView(
                row.extId(),
                row.crewExtId(),
                row.userExtId(),
                row.userNickname(),
                row.message(),
                row.status(),
                row.decidedByExtId(),
                row.decidedAt(),
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

    private static String requireLength(String raw, int min, int max, String code, String message) {
        String value = blankToNull(raw);
        if (value == null || value.length() < min || value.length() > max) {
            throw new CrewException(code, message);
        }
        return value;
    }

    private static String trimOptional(String raw, int max, String fieldName) {
        String value = blankToNull(raw);
        if (value == null) return null;
        if (value.length() > max) {
            throw new CrewException("INVALID_CREW_REQUEST", fieldName + " is too long");
        }
        return value;
    }

    private static Short parseCapacity(Integer capacity) {
        if (capacity == null) return null;
        if (capacity < 2 || capacity > 200) {
            throw new CrewException("INVALID_CREW_REQUEST", "capacity must be between 2 and 200");
        }
        return capacity.shortValue();
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

    public record CrewJoinRequestSearchResult(List<CrewJoinRequestView> items, Long nextCursor, int size) {}
}
