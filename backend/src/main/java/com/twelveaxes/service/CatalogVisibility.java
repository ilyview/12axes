package com.twelveaxes.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.HashSet;
import java.util.Set;

/**
 * Quais perfis entram nos rankings desta requisicao. Os perfis de brincadeira (data/joke-profiles.json) aparecem por
 * padrao; com {@code jokes=off} na requisicao (configuracao do usuario) eles saem de todos os rankings.
 *
 * <p>O estado e por thread, como o {@link RequestMemo}: o filtro {@code JokeVisibilityFilter} liga e desliga a cada
 * requisicao, e caches que guardam rankings incluem {@link #jokesHidden()} na chave.
 */
public final class CatalogVisibility {
    private static final Set<String> JOKES = load();
    private static final ThreadLocal<Boolean> HIDE_JOKES = ThreadLocal.withInitial(() -> false);

    private CatalogVisibility() {
    }

    public static boolean jokesHidden() {
        return HIDE_JOKES.get();
    }

    public static void hideJokes(boolean hide) {
        HIDE_JOKES.set(hide);
    }

    public static void reset() {
        HIDE_JOKES.remove();
    }

    public static boolean isJoke(String id) {
        return JOKES.contains(id);
    }

    /** O perfil pode aparecer nos rankings desta requisicao. */
    public static boolean visible(String id) {
        return !(jokesHidden() && isJoke(id));
    }

    private static Set<String> load() {
        try (InputStream in = CatalogVisibility.class.getResourceAsStream("/data/joke-profiles.json")) {
            if (in == null) {
                return Set.of();
            }
            Set<String> ids = new HashSet<>();
            JsonNode root = new ObjectMapper().readTree(in);
            root.path("ids").forEach(node -> ids.add(node.asText()));
            return Set.copyOf(ids);
        } catch (IOException e) {
            throw new UncheckedIOException("Nao foi possivel ler data/joke-profiles.json", e);
        }
    }
}
