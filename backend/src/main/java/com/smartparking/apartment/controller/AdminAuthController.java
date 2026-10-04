package com.smartparking.apartment.controller;

import com.smartparking.apartment.security.AdminAuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * POST /api/admin/login  -> { password } -> { token }          (public — this
 *                            is the one /api/admin/** route AdminAuthFilter lets through)
 * POST /api/admin/logout -> requires X-Admin-Token, revokes it
 */
@RestController
@RequestMapping("/api/admin")
public class AdminAuthController {

    @Autowired
    private AdminAuthService adminAuthService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String password = body.get("password");
        if (!adminAuthService.checkPassword(password)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Incorrect password"));
        }
        return ResponseEntity.ok(Map.of("token", adminAuthService.issueToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(value = "X-Admin-Token", required = false) String token) {
        adminAuthService.revoke(token);
        return ResponseEntity.ok().build();
    }
}
