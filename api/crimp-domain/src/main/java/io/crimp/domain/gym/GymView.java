package io.crimp.domain.gym;

import java.math.BigDecimal;

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
        String featuresJson
) {}
