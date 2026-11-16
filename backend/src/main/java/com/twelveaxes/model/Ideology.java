package com.twelveaxes.model;

import java.util.List;
import java.util.Map;

public record Ideology(
        String id,
        String name,
        String category,
        String description,
        String phrase,
        String eli5,
        String countryId,
        String personalityId,
        Map<String, Double> vector,
        List<String> religions,
        String imagePath
) {
}
