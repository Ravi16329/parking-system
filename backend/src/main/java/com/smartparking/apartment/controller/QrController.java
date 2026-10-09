package com.smartparking.apartment.controller;

import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smartparking.apartment.dto.QrResponse;
import com.smartparking.apartment.security.AdminAuthService;
import com.smartparking.apartment.service.QrService;

@RestController
@RequestMapping("/api/qr")
public class QrController {

    @Autowired
    private QrService qrService;

    @Autowired
    private AdminAuthService adminAuthService;

    // Generate QR for a confirmed booking
    @PostMapping("/generate/{bookingId}")
    public ResponseEntity<?> generateQr(
            @PathVariable String bookingId) {
        try {
            return ResponseEntity.ok(qrService.generateQr(bookingId));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // Get QR for the customer confirmation page
    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<?> getQrByBooking(
            @PathVariable String bookingId) {
        try {
            return ResponseEntity.ok(qrService.getQrByBooking(bookingId));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // Entry Check: ACTIVE -> PARKED
    @PostMapping("/entry")
    public ResponseEntity<?> verifyEntry(
            @RequestParam String token,
            @RequestHeader(value = "X-Admin-Token", required = false)
            String adminToken) {

        if (!adminAuthService.isValid(adminToken)) {
            return ResponseEntity.status(401)
                    .body(Map.of("message", "Admin login required"));
        }

        try {
            QrResponse response = qrService.verifyEntry(token);
            return ResponseEntity.ok(response);

        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", "Invalid QR code"));

        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // Exit Check: PARKED -> USED and release the occupied slot
    @PostMapping("/exit")
    public ResponseEntity<?> verifyExit(
            @RequestParam String token,
            @RequestHeader(value = "X-Admin-Token", required = false)
            String adminToken) {

        if (!adminAuthService.isValid(adminToken)) {
            return ResponseEntity.status(401)
                    .body(Map.of("message", "Admin login required"));
        }

        try {
            QrResponse response = qrService.verifyExit(token);
            return ResponseEntity.ok(response);

        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", "Invalid QR code or booking"));

        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // Keep the old endpoint temporarily for compatibility.
    // It now performs an entry check.
    @PostMapping("/verify")
    public ResponseEntity<?> verifyQr(
            @RequestParam String token,
            @RequestHeader(value = "X-Admin-Token", required = false)
            String adminToken) {

        if (!adminAuthService.isValid(adminToken)) {
            return ResponseEntity.status(401)
                    .body(Map.of("message", "Admin login required"));
        }

        try {
            return ResponseEntity.ok(qrService.verifyEntry(token));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", "Invalid QR code"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }
}