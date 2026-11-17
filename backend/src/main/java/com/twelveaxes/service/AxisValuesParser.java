package com.twelveaxes.service;

import java.util.Arrays;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Le o vetor de eixos da URL: percentuais separados por virgula, de 0 a 100, na ordem de axes.json. Posicao vazia
 * ("65,,40") e eixo sem valor (desligado nas configuracoes) e vira nulo.
 */
public final class AxisValuesParser {
    private AxisValuesParser() {
    }

    public static List<Double> parse(String values) {
        try {
            List<Double> parsed = Arrays.stream(values.split(",", -1))
                    .map(String::trim)
                    .map(value -> value.isEmpty() ? null : Double.parseDouble(value))
                    .toList();
            if (parsed.stream().allMatch(java.util.Objects::isNull)) {
                throw new NumberFormatException("nenhum valor");
            }
            if (parsed.stream().filter(java.util.Objects::nonNull).anyMatch(value -> value.isNaN() || value < 0 || value > 100)) {
                throw new NumberFormatException("fora do intervalo 0-100");
            }
            return parsed;
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vetor de eixos inválido");
        }
    }
}
