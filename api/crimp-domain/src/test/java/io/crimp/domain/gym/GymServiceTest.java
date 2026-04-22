package io.crimp.domain.gym;

import io.crimp.core.entity.gym.Gym;
import io.crimp.core.repository.gym.GymRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GymServiceTest {

    private GymRepository gymRepo;
    private GymService service;

    @BeforeEach
    void setUp() {
        gymRepo = mock(GymRepository.class);
        service = new GymService(gymRepo);
    }

    @Test
    void search_with_keyword_and_brand() {
        Gym g1 = gym(10L, "01HGYMSEED1", "강남점", "더클라임");
        Gym g2 = gym(5L, "01HGYMSEED2", "홍대점", "더클라임");
        Slice<Gym> slice = new SliceImpl<>(List.of(g1, g2), Pageable.ofSize(20), false);

        when(gymRepo.search(eq(null), eq("강남"), eq("더클라임"), any())).thenReturn(slice);

        var result = service.search(null, "강남", "더클라임", 20);
        assertThat(result.items()).hasSize(2);
        assertThat(result.items().get(0).extId()).isEqualTo("01HGYMSEED1");
        assertThat(result.nextCursor()).isNull();
        assertThat(result.size()).isEqualTo(20);
    }

    @Test
    void search_sets_nextCursor_when_hasNext() {
        Gym g1 = gym(10L, "01HGYMA", "A", "브A");
        Gym g2 = gym(7L, "01HGYMB", "B", "브B");
        Slice<Gym> slice = new SliceImpl<>(List.of(g1, g2), Pageable.ofSize(2), true);
        when(gymRepo.search(any(), any(), any(), any())).thenReturn(slice);

        var result = service.search(100L, null, null, 2);
        assertThat(result.nextCursor()).isEqualTo(7L);
    }

    @Test
    void search_trims_blank_keyword_and_brand() {
        Slice<Gym> empty = new SliceImpl<>(List.of(), Pageable.ofSize(20), false);
        when(gymRepo.search(any(), any(), any(), any())).thenReturn(empty);

        service.search(null, "   ", "  ", null);

        ArgumentCaptor<String> keywordCap = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> brandCap = ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(gymRepo).search(any(), keywordCap.capture(), brandCap.capture(), any());
        assertThat(keywordCap.getValue()).isNull();
        assertThat(brandCap.getValue()).isNull();
    }

    @Test
    void search_caps_size_at_50() {
        Slice<Gym> empty = new SliceImpl<>(List.of(), Pageable.ofSize(50), false);
        when(gymRepo.search(any(), any(), any(), any())).thenReturn(empty);

        var result = service.search(null, null, null, 1000);
        assertThat(result.size()).isEqualTo(50);
    }

    @Test
    void search_default_size_20_when_null_or_zero() {
        Slice<Gym> empty = new SliceImpl<>(List.of(), Pageable.ofSize(20), false);
        when(gymRepo.search(any(), any(), any(), any())).thenReturn(empty);

        assertThat(service.search(null, null, null, null).size()).isEqualTo(20);
        assertThat(service.search(null, null, null, 0).size()).isEqualTo(20);
    }

    @Test
    void getByExtId_returnsView() {
        Gym g = gym(1L, "01HGYMX", "xpoint", "스탯");
        when(gymRepo.findByExtId("01HGYMX")).thenReturn(Optional.of(g));
        GymView view = service.getByExtId("01HGYMX");
        assertThat(view.extId()).isEqualTo("01HGYMX");
        assertThat(view.name()).isEqualTo("xpoint");
    }

    @Test
    void getByExtId_notFound_throws() {
        when(gymRepo.findByExtId("nope")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getByExtId("nope"))
                .isInstanceOf(GymException.class)
                .satisfies(e -> assertThat(((GymException) e).code()).isEqualTo("GYM_NOT_FOUND"));
    }

    // --- helpers ---

    private static Gym gym(long id, String extId, String name, String brand) {
        Gym g = Gym.create(extId, name, "서울시 어딘가", new BigDecimal("37.5000000"), new BigDecimal("127.0000000"));
        setField(g, "id", id);
        return g;
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
