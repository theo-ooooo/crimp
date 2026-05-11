package io.crimp.domain.crew;

import io.crimp.common.id.UlidGenerator;
import io.crimp.common.config.AppProperties;
import io.crimp.core.entity.crew.Crew;
import io.crimp.core.entity.crew.CrewJoinRequest;
import io.crimp.core.entity.crew.CrewMeetup;
import io.crimp.core.entity.crew.CrewMember;
import io.crimp.core.entity.crew.MeetupParticipant;
import io.crimp.core.entity.enums.CrewJoinPolicy;
import io.crimp.core.entity.enums.CrewJoinRequestStatus;
import io.crimp.core.entity.enums.CrewMemberRole;
import io.crimp.core.entity.enums.CrewLevelBand;
import io.crimp.core.entity.enums.CrewMemberStatus;
import io.crimp.core.entity.enums.CrewStyle;
import io.crimp.core.entity.enums.GymStatus;
import io.crimp.core.entity.enums.MediaKind;
import io.crimp.core.entity.enums.MediaStatus;
import io.crimp.core.entity.enums.MediaUsage;
import io.crimp.core.entity.enums.MeetupJoinPolicy;
import io.crimp.core.entity.enums.MeetupParticipantStatus;
import io.crimp.core.entity.gym.Gym;
import io.crimp.core.entity.media.MediaAsset;
import io.crimp.core.entity.media.MediaImageVariant;
import io.crimp.core.entity.user.Profile;
import io.crimp.core.entity.user.User;
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
import io.crimp.core.repository.user.ProfileRepository;
import io.crimp.core.repository.user.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.Instant;

@Service
@org.springframework.context.annotation.Profile("!test")
public class CrewService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;
    private static final int MAX_CREWS_PER_OWNER = 10;
    private static final long MEETUP_START_CLOCK_SKEW_SECONDS = 60;

    private final CrewRepository crewRepository;
    private final CrewJoinRequestRepository crewJoinRequestRepository;
    private final CrewMemberRepository crewMemberRepository;
    private final CrewMeetupRepository crewMeetupRepository;
    private final MeetupParticipantRepository meetupParticipantRepository;
    private final GymRepository gymRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final MediaImageVariantRepository mediaImageVariantRepository;
    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final AppProperties appProperties;

    public CrewService(CrewRepository crewRepository, CrewJoinRequestRepository crewJoinRequestRepository,
                       CrewMemberRepository crewMemberRepository,
                       CrewMeetupRepository crewMeetupRepository,
                       MeetupParticipantRepository meetupParticipantRepository,
                       GymRepository gymRepository,
                       MediaAssetRepository mediaAssetRepository,
                       MediaImageVariantRepository mediaImageVariantRepository,
                       UserRepository userRepository,
                       ProfileRepository profileRepository,
                       AppProperties appProperties) {
        this.crewRepository = crewRepository;
        this.crewJoinRequestRepository = crewJoinRequestRepository;
        this.crewMemberRepository = crewMemberRepository;
        this.crewMeetupRepository = crewMeetupRepository;
        this.meetupParticipantRepository = meetupParticipantRepository;
        this.gymRepository = gymRepository;
        this.mediaAssetRepository = mediaAssetRepository;
        this.mediaImageVariantRepository = mediaImageVariantRepository;
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.appProperties = appProperties;
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
        Long imageMediaId = resolveCrewImageId(ownerUserId, command.imageMediaId());

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
                .imageMediaId(imageMediaId)
                .name(name)
                .summary(summary)
                .description(description)
                .region(region)
                .levelBand(levelBand)
                .style(style)
                .capacity(capacity)
                .build();
        crewRepository.save(crew);
        crewMemberRepository.save(CrewMember.create(
                crew.getId(), ownerUserId, CrewMemberRole.OWNER, CrewMemberStatus.ACTIVE));
        crewRepository.flush();
        return getByExtId(ownerUserId, crew.getExtId());
    }

    @Transactional
    public CrewView update(Long actorUserId, String crewExtId, UpdateCrewCommand command) {
        Crew crew = crewRepository.findByExtId(crewExtId)
                .filter(c -> !c.isDeleted())
                .orElseThrow(() -> new CrewException("CREW_NOT_FOUND", "Crew " + crewExtId + " not found"));
        requireAdmin(crew.getId(), actorUserId);

        String name = crew.getName();
        if (command.name() != null && !command.name().trim().equals(name)) {
            throw new CrewException("INVALID_CREW_REQUEST", "Crew name cannot be changed");
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
        Long imageMediaId = resolveUpdatedImageMediaId(actorUserId, command, crew);

        crew.updateBasic(name, summary, description, region, homeGymId, imageMediaId, levelBand, style, capacity);
        crewRepository.flush();
        return getByExtId(actorUserId, crew.getExtId());
    }

    @Transactional
    public CrewMeetupView createMeetup(Long actorUserId, String crewExtId, CreateCrewMeetupCommand command) {
        Crew crew = crewExtId == null ? null : findActiveCrew(crewExtId);
        if (crew != null) {
            requireAdmin(crew.getId(), actorUserId);
        }
        String title = requireLength(command.title(), 2, 60, "INVALID_CREW_MEETUP_REQUEST",
                "Meetup title must be 2-60 characters");
        String description = trimOptional(command.description(), 500, "description");
        Gym gym = resolveMeetupGym(command.gymExtId());
        String location = gym == null ? trimOptional(command.location(), 100, "location") : gym.getName();
        Short capacity = parseCapacity(command.capacity());
        MeetupJoinPolicy joinPolicy = parseEnum(MeetupJoinPolicy.class, command.joinPolicy(), "INVALID_CREW_MEETUP_REQUEST");
        if (command.startsAt() == null) {
            throw new CrewException("INVALID_CREW_MEETUP_REQUEST", "startsAt is required");
        }
        if (command.startsAt().isBefore(Instant.now().minusSeconds(MEETUP_START_CLOCK_SKEW_SECONDS))) {
            throw new CrewException("INVALID_CREW_MEETUP_REQUEST", "startsAt must be in the future");
        }
        if (command.endsAt() != null && !command.endsAt().isAfter(command.startsAt())) {
            throw new CrewException("INVALID_CREW_MEETUP_REQUEST", "endsAt must be after startsAt");
        }

        CrewMeetup meetup = CrewMeetup.builder()
                .extId(UlidGenerator.next())
                .crewId(crew == null ? null : crew.getId())
                .createdBy(actorUserId)
                .gymId(gym == null ? null : gym.getId())
                .title(title)
                .description(description)
                .startsAt(command.startsAt())
                .endsAt(command.endsAt())
                .location(location)
                .capacity(capacity)
                .joinPolicy(joinPolicy)
                .build();
        crewMeetupRepository.saveAndFlush(meetup);
        meetupParticipantRepository.save(MeetupParticipant.join(
                meetup.getId(), actorUserId, MeetupParticipantStatus.ACTIVE, null));
        meetupParticipantRepository.flush();
        return toMeetupView(meetup, actorUserId);
    }

    @Transactional(readOnly = true)
    public List<CrewMeetupView> listMeetups(Long viewerUserId, String crewExtId, Integer size) {
        Crew crew = findActiveCrew(crewExtId);
        int pageSize = capSize(size);
        return crewMeetupRepository
                .findByCrewIdAndDeletedAtIsNullAndStartsAtGreaterThanEqualOrderByStartsAtAscIdAsc(
                        crew.getId(), Instant.now(), PageRequest.of(0, pageSize))
                .stream()
                .map(meetup -> toMeetupView(meetup, viewerUserId))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CrewMeetupView> listAllMeetups(Long viewerUserId, Integer size) {
        int pageSize = capSize(size);
        return crewMeetupRepository
                .findByDeletedAtIsNullAndStartsAtGreaterThanEqualOrderByStartsAtAscIdAsc(
                        Instant.now(), PageRequest.of(0, pageSize))
                .stream()
                .map(meetup -> toMeetupView(meetup, viewerUserId))
                .toList();
    }

    @Transactional(readOnly = true)
    public CrewMeetupView getMeetup(Long viewerUserId, String meetupExtId) {
        return toMeetupView(findActiveMeetup(meetupExtId), viewerUserId);
    }

    @Transactional
    public CrewMeetupView updateMeetup(Long actorUserId, String meetupExtId, UpdateCrewMeetupCommand command) {
        CrewMeetup meetup = findActiveMeetup(meetupExtId);
        requireMeetupManager(meetup, actorUserId);
        requireUpcoming(meetup);

        String title = command.title() == null
                ? meetup.getTitle()
                : requireLength(command.title(), 2, 60, "INVALID_CREW_MEETUP_REQUEST",
                "Meetup title must be 2-60 characters");
        String description = command.description() == null
                ? meetup.getDescription()
                : trimOptional(command.description(), 500, "description");
        Gym gym = command.gymExtId() == null ? (meetup.getGymId() == null
                ? null
                : gymRepository.findById(meetup.getGymId()).orElse(null)) : resolveMeetupGym(command.gymExtId());
        String location = command.gymExtId() == null
                ? command.location() == null ? meetup.getLocation() : trimOptional(command.location(), 100, "location")
                : gym == null ? null : gym.getName();
        Instant startsAt = command.startsAt() == null ? meetup.getStartsAt() : command.startsAt();
        Instant endsAt = command.endsAt() == null ? meetup.getEndsAt() : command.endsAt();
        Short capacity = command.capacity() == null ? meetup.getCapacity() : parseCapacity(command.capacity());
        MeetupJoinPolicy joinPolicy = command.joinPolicy() == null
                ? meetup.getJoinPolicy()
                : parseEnum(MeetupJoinPolicy.class, command.joinPolicy(), "INVALID_CREW_MEETUP_REQUEST");

        if (startsAt.isBefore(Instant.now().minusSeconds(MEETUP_START_CLOCK_SKEW_SECONDS))) {
            throw new CrewException("INVALID_CREW_MEETUP_REQUEST", "startsAt must be in the future");
        }
        if (endsAt != null && !endsAt.isAfter(startsAt)) {
            throw new CrewException("INVALID_CREW_MEETUP_REQUEST", "endsAt must be after startsAt");
        }
        if (capacity != null && meetupParticipantRepository.countByMeetupIdAndStatus(
                meetup.getId(), MeetupParticipantStatus.ACTIVE) > capacity) {
            throw new CrewException("MEETUP_CAPACITY_FULL", "Meetup active participants exceed capacity");
        }

        meetup.updateBasic(title, description, gym == null ? null : gym.getId(), startsAt, endsAt, location,
                capacity, joinPolicy);
        crewMeetupRepository.flush();
        return toMeetupView(meetup, actorUserId);
    }

    @Transactional
    public CrewMeetupView joinMeetup(Long actorUserId, String meetupExtId, String message) {
        CrewMeetup meetup = findActiveMeetup(meetupExtId);
        if (meetup.getStartsAt().isBefore(Instant.now().minusSeconds(MEETUP_START_CLOCK_SKEW_SECONDS))) {
            throw new CrewException("MEETUP_CLOSED", "Meetup already started");
        }
        if (meetupParticipantRepository.existsByMeetupIdAndUserIdAndStatus(
                meetup.getId(), actorUserId, MeetupParticipantStatus.ACTIVE)
                || meetupParticipantRepository.existsByMeetupIdAndUserIdAndStatus(
                        meetup.getId(), actorUserId, MeetupParticipantStatus.PENDING)) {
            return toMeetupView(meetup, actorUserId);
        }
        MeetupParticipantStatus nextStatus = meetup.getJoinPolicy() == MeetupJoinPolicy.APPROVAL
                ? MeetupParticipantStatus.PENDING
                : MeetupParticipantStatus.ACTIVE;
        String requestMessage = nextStatus == MeetupParticipantStatus.PENDING
                ? trimOptional(message, 500, "message")
                : null;
        if (meetup.getCapacity() != null
                && meetupParticipantRepository.countByMeetupIdAndStatus(
                        meetup.getId(), MeetupParticipantStatus.ACTIVE) >= meetup.getCapacity()) {
            throw new CrewException("MEETUP_CAPACITY_FULL", "Meetup capacity is full");
        }
        MeetupParticipant participant = meetupParticipantRepository
                .findByMeetupIdAndUserId(meetup.getId(), actorUserId)
                .orElse(null);
        if (participant == null) {
            meetupParticipantRepository.save(MeetupParticipant.join(meetup.getId(), actorUserId, nextStatus, requestMessage));
        } else {
            participant.reactivate(nextStatus, requestMessage);
        }
        meetupParticipantRepository.flush();
        return toMeetupView(meetup, actorUserId);
    }

    @Transactional
    public CrewMeetupView leaveMeetup(Long actorUserId, String meetupExtId) {
        CrewMeetup meetup = findActiveMeetup(meetupExtId);
        MeetupParticipant participant = meetupParticipantRepository
                .findByMeetupIdAndUserId(meetup.getId(), actorUserId)
                .orElseThrow(() -> new CrewException("MEETUP_PARTICIPANT_NOT_FOUND", "Meetup participant not found"));
        participant.cancel();
        meetupParticipantRepository.flush();
        return toMeetupView(meetup, actorUserId);
    }

    @Transactional
    public void deleteMeetup(Long actorUserId, String meetupExtId) {
        CrewMeetup meetup = findActiveMeetup(meetupExtId);
        requireMeetupManager(meetup, actorUserId);
        requireUpcoming(meetup);
        meetup.softDelete();
        crewMeetupRepository.flush();
    }

    @Transactional(readOnly = true)
    public List<MeetupParticipantView> listMeetupParticipants(Long actorUserId, String meetupExtId, String status) {
        CrewMeetup meetup = findActiveMeetup(meetupExtId);
        MeetupParticipantStatus parsedStatus = status == null
                ? MeetupParticipantStatus.ACTIVE
                : parseEnum(MeetupParticipantStatus.class, status, "INVALID_CREW_MEETUP_REQUEST");
        if (parsedStatus == MeetupParticipantStatus.PENDING) {
            requireMeetupManager(meetup, actorUserId);
        }
        return meetupParticipantRepository
                .findByMeetupIdAndStatusInOrderByJoinedAtAscUserIdAsc(meetup.getId(), List.of(parsedStatus))
                .stream()
                .map(this::toParticipantView)
                .toList();
    }

    @Transactional
    public MeetupParticipantView approveMeetupParticipant(Long actorUserId, String meetupExtId, String userExtId) {
        CrewMeetup meetup = findActiveMeetup(meetupExtId);
        requireMeetupManager(meetup, actorUserId);
        requireUpcoming(meetup);
        MeetupParticipant participant = findMeetupParticipantByUserExtId(meetup, userExtId, MeetupParticipantStatus.PENDING);
        if (meetup.getCapacity() != null && meetupParticipantRepository.countByMeetupIdAndStatus(
                meetup.getId(), MeetupParticipantStatus.ACTIVE) >= meetup.getCapacity()) {
            throw new CrewException("MEETUP_CAPACITY_FULL", "Meetup capacity is full");
        }
        participant.approve();
        meetupParticipantRepository.flush();
        return toParticipantView(participant);
    }

    @Transactional
    public MeetupParticipantView rejectMeetupParticipant(Long actorUserId, String meetupExtId, String userExtId) {
        CrewMeetup meetup = findActiveMeetup(meetupExtId);
        requireMeetupManager(meetup, actorUserId);
        requireUpcoming(meetup);
        MeetupParticipant participant = findMeetupParticipantByUserExtId(meetup, userExtId, MeetupParticipantStatus.PENDING);
        participant.reject();
        meetupParticipantRepository.flush();
        return toParticipantView(participant);
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

        crewMemberRepository.findByCrewIdAndUserId(crew.getId(), request.getUserId())
                .ifPresentOrElse(
                        CrewMember::reactivateAsMember,
                        () -> crewMemberRepository.save(CrewMember.create(
                                crew.getId(), request.getUserId(), CrewMemberRole.MEMBER, CrewMemberStatus.ACTIVE)));
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
    public CrewMemberSearchResult listMembers(Long viewerUserId, String crewExtId, Long cursorUserId, Integer size) {
        Crew crew = findActiveCrew(crewExtId);
        int pageSize = capSize(size);
        Slice<CrewMemberRow> slice = crewMemberRepository.searchActiveByCrew(
                crew.getId(), cursorUserId, PageRequest.of(0, pageSize));
        List<CrewMemberView> items = slice.getContent().stream().map(CrewService::toMemberView).toList();
        Long nextCursor = slice.hasNext() && !slice.getContent().isEmpty()
                ? slice.getContent().get(slice.getContent().size() - 1).userId()
                : null;
        return new CrewMemberSearchResult(items, nextCursor, pageSize);
    }

    @Transactional
    public void leaveCrew(Long userId, String crewExtId) {
        Crew crew = findActiveCrewForUpdate(crewExtId);
        CrewMember member = crewMemberRepository.findByCrewIdAndUserIdAndStatus(
                        crew.getId(), userId, CrewMemberStatus.ACTIVE)
                .orElseThrow(() -> new CrewException("CREW_MEMBER_NOT_FOUND", "Active crew member not found"));
        if (member.getRole() == CrewMemberRole.OWNER
                && crewMemberRepository.countByCrewIdAndRoleAndStatus(
                crew.getId(), CrewMemberRole.OWNER, CrewMemberStatus.ACTIVE) <= 1) {
            throw new CrewException("CREW_OWNER_LEAVE_BLOCKED", "Last crew owner cannot leave");
        }

        member.leave();
        crew.decrementMemberCount();
        crewRepository.flush();
    }

    @Transactional
    public void removeMember(Long actorUserId, String crewExtId, String memberUserExtId) {
        Crew crew = findActiveCrewForUpdate(crewExtId);
        CrewMember actor = requireAdminMember(crew.getId(), actorUserId);
        Long memberUserId = userRepository.findByExtId(memberUserExtId)
                .map(User::getId)
                .orElseThrow(() -> new CrewException("CREW_MEMBER_NOT_FOUND", "Crew member not found"));
        CrewMember member = crewMemberRepository.findByCrewIdAndUserIdAndStatus(
                        crew.getId(), memberUserId, CrewMemberStatus.ACTIVE)
                .orElseThrow(() -> new CrewException("CREW_MEMBER_NOT_FOUND", "Active crew member not found"));
        if (member.getRole() == CrewMemberRole.OWNER) {
            throw new CrewException("CREW_OWNER_LEAVE_BLOCKED", "Crew owner cannot be removed");
        }
        if (actor.getRole() == CrewMemberRole.ADMIN && member.getRole() == CrewMemberRole.ADMIN) {
            throw new CrewException("CREW_FORBIDDEN", "Admin cannot remove another admin");
        }
        member.leave();
        crew.decrementMemberCount();
        crewRepository.flush();
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

        List<CrewView> items = slice.getContent().stream().map(this::toView).toList();
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

    private Long resolveUpdatedImageMediaId(Long actorUserId, UpdateCrewCommand command, Crew crew) {
        if (command.clearImage() && command.imageMediaId() != null) {
            throw new CrewException("INVALID_CREW_REQUEST", "clearImage cannot be combined with imageMediaId");
        }
        if (command.clearImage()) return null;
        if (command.imageMediaId() != null) return resolveCrewImageId(actorUserId, command.imageMediaId());
        return crew.getImageMediaId();
    }

    private Long resolveCrewImageId(Long actorUserId, Long imageMediaId) {
        if (imageMediaId == null) return null;
        MediaAsset asset = mediaAssetRepository.findById(imageMediaId)
                .orElseThrow(() -> new CrewException("CREW_IMAGE_MEDIA_NOT_FOUND", "Crew image media not found: " + imageMediaId));
        if (!asset.getOwnerUserId().equals(actorUserId)) {
            throw new CrewException("CREW_IMAGE_MEDIA_FORBIDDEN", "Crew image belongs to another user: " + imageMediaId);
        }
        if (asset.getKind() != MediaKind.IMAGE
                || asset.getStatus() != MediaStatus.READY
                || asset.getUsage() != MediaUsage.CREW) {
            throw new CrewException("CREW_IMAGE_MEDIA_INVALID", "Crew image must be a READY CREW IMAGE: " + imageMediaId);
        }
        return asset.getId();
    }

    private Long resolveHomeGymId(String homeGymExtId) {
        String extId = blankToNull(homeGymExtId);
        if (extId == null) return null;
        Gym gym = gymRepository.findByExtIdAndStatus(extId, GymStatus.ACTIVE)
                .orElseThrow(() -> new CrewException("CREW_HOME_GYM_NOT_FOUND", "Home gym not found or inactive: " + extId));
        return gym.getId();
    }

    private Gym resolveMeetupGym(String gymExtId) {
        String extId = blankToNull(gymExtId);
        if (extId == null) return null;
        return gymRepository.findByExtIdAndStatus(extId, GymStatus.ACTIVE)
                .orElseThrow(() -> new CrewException("CREW_HOME_GYM_NOT_FOUND", "Meetup gym not found or inactive: " + extId));
    }

    private void requireAdmin(Long crewId, Long actorUserId) {
        requireAdminMember(crewId, actorUserId);
    }

    private CrewMember requireAdminMember(Long crewId, Long actorUserId) {
        CrewMember member = crewMemberRepository.findByCrewIdAndUserIdAndStatus(crewId, actorUserId, CrewMemberStatus.ACTIVE)
                .orElseThrow(() -> new CrewException("CREW_FORBIDDEN", "Crew admin permission required"));
        if (member.getRole() != CrewMemberRole.OWNER && member.getRole() != CrewMemberRole.ADMIN) {
            throw new CrewException("CREW_FORBIDDEN", "Crew admin permission required");
        }
        return member;
    }

    private CrewView toView(CrewSearchRow row) {
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
                row.imageMediaId(),
                resolveCrewImageUrl(row.imageMediaId()),
                row.levelBand(),
                row.style(),
                row.memberCount() == null ? 0 : row.memberCount(),
                row.capacity() == null ? null : row.capacity().intValue(),
                row.joinPolicy(),
                myStatus(row),
                resolveNextMeetup(row.id()),
                resolveMemberPreview(row.id()),
                owner,
                row.createdAt());
    }

    private CrewMeetupView resolveNextMeetup(Long crewId) {
        List<CrewMeetup> meetups = crewMeetupRepository
                .findByCrewIdAndDeletedAtIsNullAndStartsAtGreaterThanEqualOrderByStartsAtAscIdAsc(
                        crewId, Instant.now(), PageRequest.of(0, 1));
        if (meetups == null) {
            return null;
        }
        return meetups.stream()
                .findFirst()
                .map(meetup -> toMeetupView(meetup, null))
                .orElse(null);
    }

    private List<CrewMemberView> resolveMemberPreview(Long crewId) {
        Slice<CrewMemberRow> slice = crewMemberRepository.searchActiveByCrew(crewId, null, PageRequest.of(0, 5));
        if (slice == null) {
            return List.of();
        }
        return slice.getContent()
                .stream()
                .map(CrewService::toMemberView)
                .toList();
    }

    private String resolveCrewImageUrl(Long imageMediaId) {
        if (imageMediaId == null) return null;
        String cdnBaseUrl = appProperties.media().cdnBaseUrl();
        if (cdnBaseUrl == null || cdnBaseUrl.isBlank()) return null;
        String variantPath = mediaImageVariantRepository
                .findFirstByMediaIdAndStatusAndPrimaryTrueOrderByIdDesc(imageMediaId, MediaStatus.READY)
                .map(MediaImageVariant::getPath)
                .orElse(null);
        return variantPath == null ? null : joinUrl(cdnBaseUrl, variantPath);
    }

    private CrewMeetup findActiveMeetup(String meetupExtId) {
        return crewMeetupRepository.findByExtIdAndDeletedAtIsNull(meetupExtId)
                .orElseThrow(() -> new CrewException("MEETUP_NOT_FOUND", "Meetup " + meetupExtId + " not found"));
    }

    private void requireUpcoming(CrewMeetup meetup) {
        if (meetup.getStartsAt().isBefore(Instant.now().minusSeconds(MEETUP_START_CLOCK_SKEW_SECONDS))) {
            throw new CrewException("MEETUP_CLOSED", "Meetup already started");
        }
    }

    private void requireMeetupManager(CrewMeetup meetup, Long actorUserId) {
        if (meetup.getCreatedBy().equals(actorUserId)) {
            return;
        }
        if (meetup.getCrewId() != null) {
            requireAdmin(meetup.getCrewId(), actorUserId);
            return;
        }
        throw new CrewException("MEETUP_FORBIDDEN", "Meetup manager permission required");
    }

    private MeetupParticipant findMeetupParticipantByUserExtId(
            CrewMeetup meetup,
            String userExtId,
            MeetupParticipantStatus status) {
        Long userId = userRepository.findByExtId(userExtId)
                .map(User::getId)
                .orElseThrow(() -> new CrewException("MEETUP_PARTICIPANT_NOT_FOUND", "Meetup participant not found"));
        MeetupParticipant participant = meetupParticipantRepository.findByMeetupIdAndUserId(meetup.getId(), userId)
                .orElseThrow(() -> new CrewException("MEETUP_PARTICIPANT_NOT_FOUND", "Meetup participant not found"));
        if (participant.getStatus() != status) {
            throw new CrewException("MEETUP_PARTICIPANT_NOT_FOUND", "Meetup participant not found");
        }
        return participant;
    }

    private CrewMeetupView toMeetupView(CrewMeetup meetup, Long viewerUserId) {
        Crew crew = meetup.getCrewId() == null ? null : crewRepository.findById(meetup.getCrewId()).orElse(null);
        Gym gym = meetup.getGymId() == null ? null : gymRepository.findById(meetup.getGymId()).orElse(null);
        int participantCount = (int) meetupParticipantRepository.countByMeetupIdAndStatus(
                meetup.getId(), MeetupParticipantStatus.ACTIVE);
        String myParticipation = viewerUserId == null ? "NONE"
                : meetupParticipantRepository.existsByMeetupIdAndUserIdAndStatus(
                        meetup.getId(), viewerUserId, MeetupParticipantStatus.ACTIVE) ? "JOINED"
                : meetupParticipantRepository.existsByMeetupIdAndUserIdAndStatus(
                        meetup.getId(), viewerUserId, MeetupParticipantStatus.PENDING) ? "PENDING" : "NONE";
        MeetupHostView host = resolveMeetupHost(meetup.getCreatedBy());
        return new CrewMeetupView(
                meetup.getExtId(),
                meetup.getTitle(),
                meetup.getDescription(),
                meetup.getStartsAt(),
                meetup.getEndsAt(),
                crew == null ? null : crew.getExtId(),
                crew == null ? null : crew.getName(),
                gym == null ? null : gym.getExtId(),
                gym == null ? null : gym.getName(),
                meetup.getLocation(),
                meetup.getCapacity() == null ? null : meetup.getCapacity().intValue(),
                meetup.getJoinPolicy().name(),
                participantCount,
                myParticipation,
                host,
                viewerUserId != null && canManageMeetup(meetup, viewerUserId),
                meetup.getCreatedAt());
    }

    private boolean canManageMeetup(CrewMeetup meetup, Long viewerUserId) {
        if (meetup.getCreatedBy().equals(viewerUserId)) {
            return true;
        }
        if (meetup.getCrewId() == null) {
            return false;
        }
        return crewMemberRepository.findByCrewIdAndUserIdAndStatus(
                        meetup.getCrewId(), viewerUserId, CrewMemberStatus.ACTIVE)
                .map(member -> member.getRole() == CrewMemberRole.OWNER || member.getRole() == CrewMemberRole.ADMIN)
                .orElse(false);
    }

    private MeetupHostView resolveMeetupHost(Long userId) {
        String extId = userRepository.findById(userId)
                .map(User::getExtId)
                .orElse(null);
        String nickname = profileRepository.findById(userId)
                .map(Profile::getNickname)
                .orElse("탈퇴사용자");
        return new MeetupHostView(extId, nickname);
    }

    private MeetupParticipantView toParticipantView(MeetupParticipant participant) {
        MeetupHostView user = resolveMeetupHost(participant.getUserId());
        return new MeetupParticipantView(
                user.extId(),
                user.nickname(),
                participant.getStatus().name(),
                participant.getMessage(),
                participant.getJoinedAt());
    }

    private static String joinUrl(String base, String path) {
        String b = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
        String p = path.startsWith("/") ? path.substring(1) : path;
        return b + "/" + p;
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

    private static CrewMemberView toMemberView(CrewMemberRow row) {
        return new CrewMemberView(
                row.crewExtId(),
                row.userExtId(),
                row.nickname(),
                row.role(),
                row.joinedAt());
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

    public record CrewMemberSearchResult(List<CrewMemberView> items, Long nextCursor, int size) {}
}
