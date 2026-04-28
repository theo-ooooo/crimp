package io.crimp.domain.gym.sync;

import java.math.BigDecimal;
import java.util.List;

/**
 * 동기화 grid scan 의 사전 정의된 영역 묶음 (PRD §12 1-4, Phase 1.5).
 *
 * <p>Kakao Local 의 단일 호출 반경 한계(20km, 우리는 5km 사용)로는 서울 전역을 한 번에
 * 덮을 수 없다. 본 enum 은 각 광역 단위를 N 개의 영역으로 분할해 일괄 호출할 수 있는
 * 좌표 묶음을 제공한다.
 *
 * <p>좌표는 각 행정동 중심부의 대략값 (구청 부근). 5km 반경은 서로 겹치도록 잡아서 경계
 * 부근 매장이 누락되지 않게 한다 — 동일 매장이 여러 영역에서 매칭되더라도 diff 단계의
 * (이름·주소) 매칭으로 신규 등록 X (idempotent).
 */
public enum GymSyncGridPreset {

    /** 서울 25개 자치구 — 각 구청 부근 좌표 + 5km 반경. */
    SEOUL_GU(List.of(
            region("종로구", "37.5735", "126.9788"),
            region("중구",   "37.5638", "126.9975"),
            region("용산구", "37.5326", "126.9905"),
            region("성동구", "37.5634", "127.0367"),
            region("광진구", "37.5384", "127.0822"),
            region("동대문구", "37.5744", "127.0395"),
            region("중랑구", "37.6063", "127.0925"),
            region("성북구", "37.5894", "127.0167"),
            region("강북구", "37.6396", "127.0257"),
            region("도봉구", "37.6688", "127.0470"),
            region("노원구", "37.6541", "127.0568"),
            region("은평구", "37.6027", "126.9291"),
            region("서대문구", "37.5791", "126.9367"),
            region("마포구", "37.5663", "126.9018"),
            region("양천구", "37.5170", "126.8665"),
            region("강서구", "37.5509", "126.8497"),
            region("구로구", "37.4954", "126.8874"),
            region("금천구", "37.4571", "126.8950"),
            region("영등포구", "37.5263", "126.8965"),
            region("동작구", "37.5124", "126.9393"),
            region("관악구", "37.4781", "126.9515"),
            region("서초구", "37.4837", "127.0324"),
            region("강남구", "37.5172", "127.0473"),
            region("송파구", "37.5145", "127.1059"),
            region("강동구", "37.5301", "127.1238")
    ));

    private static final int DEFAULT_RADIUS_METERS = 5000;

    private final List<GymSyncRegion> regions;

    GymSyncGridPreset(List<GymSyncRegion> regions) {
        this.regions = List.copyOf(regions);
    }

    public List<GymSyncRegion> regions() {
        return regions;
    }

    private static GymSyncRegion region(String label, String lat, String lng) {
        return new GymSyncRegion(label, new BigDecimal(lat), new BigDecimal(lng), DEFAULT_RADIUS_METERS);
    }
}
