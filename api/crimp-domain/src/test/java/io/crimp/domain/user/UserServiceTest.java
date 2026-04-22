package io.crimp.domain.user;

import io.crimp.core.entity.user.Profile;
import io.crimp.core.entity.user.User;
import io.crimp.core.repository.user.ProfileRepository;
import io.crimp.core.repository.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserServiceTest {

    private UserRepository userRepo;
    private ProfileRepository profileRepo;
    private UserService service;

    @BeforeEach
    void setUp() {
        userRepo = mock(UserRepository.class);
        profileRepo = mock(ProfileRepository.class);
        service = new UserService(userRepo, profileRepo);
    }

    @Test
    void getMe_returnsView() {
        User user = user(1L, "01HUUUUUUU");
        Profile profile = Profile.create(1L, "crimper_abc");
        profile.updateBio("hi");

        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));

        ProfileView view = service.getMe(1L);
        assertThat(view.extId()).isEqualTo("01HUUUUUUU");
        assertThat(view.nickname()).isEqualTo("crimper_abc");
        assertThat(view.bio()).isEqualTo("hi");
    }

    @Test
    void getMe_userNotFound_throws() {
        when(userRepo.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getMe(99L))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).code()).isEqualTo("USER_NOT_FOUND"));
    }

    @Test
    void getMe_profileMissing_throws() {
        when(userRepo.findById(1L)).thenReturn(Optional.of(user(1L, "x")));
        when(profileRepo.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getMe(1L))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).code()).isEqualTo("PROFILE_MISSING"));
    }

    @Test
    void getPublicProfile_by_extId() {
        User user = user(5L, "01HPUBLIC__");
        Profile profile = Profile.create(5L, "foo");
        when(userRepo.findByExtId("01HPUBLIC__")).thenReturn(Optional.of(user));
        when(profileRepo.findById(5L)).thenReturn(Optional.of(profile));

        ProfileView view = service.getPublicProfile("01HPUBLIC__");
        assertThat(view.nickname()).isEqualTo("foo");
    }

    @Test
    void updateMyProfile_all_fields_applied() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "old_nick");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));
        when(profileRepo.existsByNickname("new_nick")).thenReturn(false);

        var cmd = new UpdateProfileCommand("new_nick", "new bio", (byte) 4, 9L, 7L);
        ProfileView view = service.updateMyProfile(1L, cmd);

        assertThat(view.nickname()).isEqualTo("new_nick");
        assertThat(view.bio()).isEqualTo("new bio");
        assertThat(view.levelSelf()).isEqualTo((byte) 4);
        assertThat(view.mainGymId()).isEqualTo(9L);
        assertThat(view.avatarMediaId()).isEqualTo(7L);
    }

    @Test
    void updateMyProfile_nickname_taken_throws() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "mine");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));
        when(profileRepo.existsByNickname("taken")).thenReturn(true);

        var cmd = new UpdateProfileCommand("taken", null, null, null, null);
        assertThatThrownBy(() -> service.updateMyProfile(1L, cmd))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).code()).isEqualTo("NICKNAME_TAKEN"));
    }

    @Test
    void updateMyProfile_same_nickname_skipsExistsCheck() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "mine");
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));

        var cmd = new UpdateProfileCommand("mine", "bio only", null, null, null);
        service.updateMyProfile(1L, cmd);

        verify(profileRepo, never()).existsByNickname(any());
    }

    @Test
    void updateMyProfile_null_fields_preserve_existing() {
        User user = user(1L, "01HU");
        Profile profile = Profile.create(1L, "keep");
        profile.updateBio("existing bio");
        profile.updateLevel((byte) 2);
        when(userRepo.findById(1L)).thenReturn(Optional.of(user));
        when(profileRepo.findById(1L)).thenReturn(Optional.of(profile));

        var cmd = new UpdateProfileCommand(null, null, null, null, null);
        ProfileView view = service.updateMyProfile(1L, cmd);

        assertThat(view.nickname()).isEqualTo("keep");
        assertThat(view.bio()).isEqualTo("existing bio");
        assertThat(view.levelSelf()).isEqualTo((byte) 2);
    }

    // --- helpers ---

    private static User user(long id, String extId) {
        User u = User.create(extId, null, null);
        setField(u, "id", id);
        return u;
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
