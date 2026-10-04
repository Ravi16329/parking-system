package com.smartparking.apartment.controller;

import com.smartparking.apartment.dto.OtpRequest;
import com.smartparking.apartment.dto.OtpVerifyRequest;
import com.smartparking.apartment.service.OtpService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * POST /api/otp/send -> generate + send a 6-digit code
 * POST /api/otp/verify -> check the code the user typed
 *
 * The frontend (src/api/api.js) already has matching fetch calls written and
 * commented out — uncomment them to switch off the browser-side stub.
 */
@RestController
@RequestMapping("/api/otp")
public class OtpController {

    @Autowired
    private OtpService otpService;

    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> send(@Valid @RequestBody OtpRequest request) {
        Map<String, Object> body = new HashMap<>();
        try {
            String devCode = otpService.sendOtp(request.getPhone());
            body.put("success", true);
            body.put("phone", request.getPhone());
            body.put("expiresInSec", 120);
            if (devCode != null) {
                body.put("devCode", devCode);
            }
            return ResponseEntity.ok(body);
        } catch (IllegalStateException e) {
            body.put("success", false);
            body.put("message", e.getMessage());
            return ResponseEntity.status(429).body(body);
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<Map<String, Object>> verify(@Valid @RequestBody OtpVerifyRequest request) {
        boolean ok = otpService.verifyOtp(request.getPhone(), request.getCode());
        Map<String, Object> body = new HashMap<>();
        body.put("success", ok);
        if (!ok) {
            body.put("message", "Wrong or expired code. Send a new one.");
        }
        return ResponseEntity.ok(body);
    }
}