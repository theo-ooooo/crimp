package io.crimp.domain.gym;

import io.crimp.core.entity.enums.GymStatus;
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
        service = new GymService(gymRepo, new BrandNormalizer());
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
        when(gymRepo.findByExtIdAndStatus("01HGYMX", GymStatus.ACTIVE)).thenReturn(Optional.of(g));
        GymView view = service.getByExtId("01HGYMX");
        assertThat(view.extId()).isEqualTo("01HGYMX");
        assertThat(view.name()).isEqualTo("xpoint");
    }

    @Test
    void getByExtId_notFound_or_closed_throws() {
        when(gymRepo.findByExtIdAndStatus("nope", GymStatus.ACTIVE)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getByExtId("nope"))
                .isInstanceOf(GymException.class)
                .satisfies(e -> assertThat(((GymException) e).code()).isEqualTo("GYM_NOT_FOUND"));
    }

    // --- 거리 정렬 (PR-G1) ---

    @Test
    void search_with_lat_lng_sorts_by_haversine_distance() {
        // 강남 (37.498, 127.028) ~ 홍대 (37.557, 126.924) ~ 잠실 (37.513, 127.100).
        // 사용자 위치 = 강남 → 강남이 거리 0 가장 가깝고, 잠실 < 홍대 순.
        Gym gangnam = gymAt(10L, "01HGN", "강남점", 37.498, 127.028);
        Gym hongdae = gymAt(11L, "01HHD", "홍대점", 37.557, 126.924);
        Gym jamsil  = gymAt(12L, "01HJS", "잠실점", 37.513, 127.100);
        when(gymRepo.searchAllForDistance(eq(null), eq(null)))
                .thenReturn(List.of(hongdae, gangnam, jamsil));

        var result = service.search(null, null, null, 20, 37.498, 127.028);
        assertThat(result.items()).extracting(GymView::extId)
                .containsExactly("01HGN", "01HJS", "01HHD");
        // 거리 정렬 모드는 cursor 페이지네이션 비활성.
        assertThat(result.nextCursor()).isNull();
        // 모든 item 의 distanceMeters 는 채워짐.
        assertThat(result.items()).allMatch(v -> v.distanceMeters() != null);
        // 강남=0 (정확히 0 은 아니지만 다른 둘보다 작음).
        assertThat(result.items().get(0).distanceMeters())
                .isLessThan(result.items().get(1).distanceMeters());
    }

    @Test
    void search_with_lat_lng_excludes_gym_without_coords() {
        Gym noCoord = gymAt(10L, "01HNC", "좌표없음", null, null);
        Gym gangnam = gymAt(11L, "01HGN", "강남점", 37.498, 127.028);
        when(gymRepo.searchAllForDistance(eq(null), eq(null)))
                .thenReturn(List.of(noCoord, gangnam));

        var result = service.search(null, null, null, 20, 37.5, 127.0);
        // 좌표 없는 gym 은 거리 정렬 모드에서 제외.
        assertThat(result.items()).extracting(GymView::extId).containsExactly("01HGN");
    }

    @Test
    void search_without_lat_lng_falls_back_to_id_desc() {
        // 한쪽만 주어지면 거리 모드 비활성, 기존 search() 가 호출됨.
        Gym g1 = gym(10L, "01HGYMA", "A", "브A");
        Slice<Gym> slice = new SliceImpl<>(List.of(g1), Pageable.ofSize(20), false);
        when(gymRepo.search(eq(null), eq(null), eq(null), any())).thenReturn(slice);

        var result = service.search(null, null, null, 20, 37.5, null);
        assertThat(result.items()).hasSize(1);
        assertThat(result.items().get(0).distanceMeters()).isNull();
    }

    // --- helpers ---

    private static Gym gym(long id, String extId, String name, String brand) {
        Gym g = Gym.create(extId, name, "서울시 어딘가", new BigDecimal("37.5000000"), new BigDecimal("127.0000000"));
        setField(g, "id", id);
        return g;
    }

    private static Gym gymAt(long id, String extId, String name, Double lat, Double lng) {
        Gym g = Gym.create(extId, name, "서울시 어딘가",
                lat == null ? null : BigDecimal.valueOf(lat),
                lng == null ? null : BigDecimal.valueOf(lng));
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
