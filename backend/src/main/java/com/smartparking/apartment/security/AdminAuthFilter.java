package com.smartparking.apartment.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Guards every /api/admin/** route except /api/admin/login itself: requires a
 * valid X-Admin-Token header (issued by AdminAuthController.login), otherwise
 * responds 401 before the request reaches any controller.
 */
public class AdminAuthFilter extends OncePerRequestFilter {

    private final AdminAuthService adminAuthService;

    public AdminAuthFilter(AdminAuthService adminAuthService) {
        this.adminAuthService = adminAuthService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();

        // Preflight requests never carry the app's custom headers (the browser
        // sends them separately in Access-Control-Request-Headers, not on the
        // OPTIONS request itself) — let them through untouched, or every admin
        // POST/DELETE fails as a CORS error before it even gets a chance to send
        // the real request with the token.
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        if (path.endsWith("/api/admin/login")) {
            chain.doFilter(request, response);
            return;
        }

        String token = request.getHeader("X-Admin-Token");
        if (!adminAuthService.isValid(token)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Admin login required\"}");
            return;
        }

        chain.doFilter(request, response);
    }
}