package io.crimp.core.entity.gym;

import io.crimp.core.base.BaseEntity;
import io.crimp.core.entity.enums.GymStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Getter
@Table(name = "gyms")
@NoArgsConstructor(access = PROTECTED)
public class Gym extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ext_id", nullable = false, columnDefinition = "char(26)", unique = true, updatable = false)
    private String extId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "brand", length = 50)
    private String brand;

    @Column(name = "address", nullable = false, length = 200)
    private String address;

    @Column(name = "lat", nullable = false, precision = 10, scale = 7)
    private BigDecimal lat;

    @Column(name = "lng", nullable = false, precision = 10, scale = 7)
    private BigDecimal lng;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "opening_hours", columnDefinition = "json")
    private String openingHoursJson;

    @Column(name = "setting_cycle_days")
    private Short settingCycleDays;

    @Column(name = "features", columnDefinition = "json")
    private String featuresJson;

    @Column(name = "status", nullable = false)
    private GymStatus status;

    private Gym(String extId, String name, String address, BigDecimal lat, BigDecimal lng) {
        this.extId = extId;
        this.name = name;
        this.address = address;
        this.lat = lat;
        this.lng = lng;
        this.status = GymStatus.ACTIVE;
    }

    public static Gym create(String extId, String name, String address, BigDecimal lat, BigDecimal lng) {
        return new Gym(extId, name, address, lat, lng);
    }

    /**
     * 외부 동기화 소스(Kakao Local 등) 의 최신 속성으로 본 매장을 갱신한다.
     *
     * <p>갱신 대상은 좌표·brand·phone — 매칭 키인 name/address 는 건드리지 않는다.
     * JPA dirty checking 이 트랜잭션 종료 시점에 변경된 컬럼만 UPDATE 로 반영.
     *
     * <p><b>null 정책</b> (PR #85 리뷰 I3): {@code brand}/{@code phone} 이 null 이면
     * "외부에서 정보 누락" 으로 간주해 기존 값을 유지한다. 외부 응답이 일시적으로 phone
     * 누락을 반환했을 때 기존 데이터가 null 로 덮어쓰이는 회귀를 막기 위함. 좌표는
     * Kakao 어댑터 단계에서 빈 좌표 doc 을 이미 스킵하므로 항상 non-null 이라 가정.
     */
    public void applyRemoteUpdate(String brand, String phone, BigDecimal lat, BigDecimal lng) {
        if (brand != null) this.brand = brand;
        if (phone != null) this.phone = phone;
        this.lat = lat;
        this.lng = lng;
    }
}
