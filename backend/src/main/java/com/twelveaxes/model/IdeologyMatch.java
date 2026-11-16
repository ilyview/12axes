package com.twelveaxes.model;

public record IdeologyMatch(
        String ideologyId,
        String name,
        String category,
        String description,
        String longDescription,
        String phrase,
        String eli5,
        double compatibility,
        double compatibilityPercentile,
        String imagePath
) {
}
