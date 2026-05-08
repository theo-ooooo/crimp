package io.crimp.domain.crew;

public record UpdateCrewCommand(
        String name,
        String summary,
        String description,
        String region,
        String homeGymExtId,
        boolean clearHomeGym,
        String levelBand,
        String style,
        Integer capacity,
        boolean clearCapacity
) {}
