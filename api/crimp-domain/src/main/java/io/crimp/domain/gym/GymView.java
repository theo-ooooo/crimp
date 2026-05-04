package io.crimp.domain.gym;

import java.math.BigDecimal;

/**
 * Gym 도메인 뷰. 검색·상세 응답의 공통 형태.
 *
 * <p>{@code distanceMeters} 는 검색 시 {@code lat,lng} 가 주어졌을 때만 채워짐. 미사용 시 null.
 * Phase 1 은 java haversine 으로 계산 (수십~수백 gym 데이터에서 충분), 후속에 MySQL 8 의
 * {@code ST_Distance_Sphere} 로 마이그레이트.
 */
public record GymView(
        String extId,
        String name,
        String brand,
        String address,
        BigDecimal lat,
        BigDecimal lng,
        String phone,
        String openingHoursJson,
        Integer settingCycleDays,
        String featuresJson,
        Double distanceMeters
) {}
