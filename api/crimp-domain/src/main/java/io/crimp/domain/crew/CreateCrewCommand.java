package io.crimp.domain.crew;

public record CreateCrewCommand(
        String name,
        String summary,
        String description,
        String region,
        String homeGymExtId,
        Long imageMediaId,
        String levelBand,
        String style,
        Integer capacity
) {}
