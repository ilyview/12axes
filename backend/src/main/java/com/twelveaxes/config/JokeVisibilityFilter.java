package com.twelveaxes.config;

import com.twelveaxes.service.CatalogVisibility;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Le {@code jokes=off} (configuracao do usuario) e esconde os perfis de brincadeira durante a requisicao. */
@Component
public class JokeVisibilityFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String jokes = request.getParameter("jokes");
        CatalogVisibility.hideJokes("off".equalsIgnoreCase(jokes) || "0".equals(jokes) || "false".equalsIgnoreCase(jokes));
        try {
            chain.doFilter(request, response);
        } finally {
            CatalogVisibility.reset();
        }
    }
}
