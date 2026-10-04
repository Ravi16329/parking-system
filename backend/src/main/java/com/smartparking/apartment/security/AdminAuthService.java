package com.smartparking.apartment.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Deliberately simple admin auth: one fixed password from application.properties,
 * and an in-memory map of "logged in" tokens (lost on restart, same as the rest
 * of this app's H2 data — that's fine for this project's scope).
 *
 * Not meant to hold up as-is in a real production system (the password is
 * plaintext in application.properties, tokens aren't signed) — if this ever
 * needs to be hardened, swap this class for Spring Security + JWT and the
 * password for a hashed one; nothing else in the admin controllers needs to
 * change since they only depend on isValid(token).
 */
@Service
public class AdminAuthService {

    private static final Duration TOKEN_TTL = Duration.ofHours(4);

    private final Map<String, Instant> tokens = new ConcurrentHashMap<>();

    @Value("${app.admin.password}")
    private String adminPassword;

    public boolean checkPassword(String password) {
        return adminPassword != null && adminPassword.equals(password);
    }

    public String issueToken() {
        String token = UUID.randomUUID().toString();
        tokens.put(token, Instant.now().plus(TOKEN_TTL));
        return token;
    }

    public boolean isValid(String token) {
        if (token == null) return false;
        Instant expiry = tokens.get(token);
        if (expiry == null) return false;
        if (Instant.now().isAfter(expiry)) {
            tokens.remove(token);
            return false;
        }
        return true;
    }

    public void revoke(String token) {
        if (token != null) tokens.remove(token);
    }
}
