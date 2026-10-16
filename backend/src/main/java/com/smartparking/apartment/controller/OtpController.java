

// package com.smartparking.apartment.controller;

// import java.util.HashMap;
// import java.util.Map;

// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.http.ResponseEntity;
// import org.springframework.web.bind.annotation.PostMapping;
// import org.springframework.web.bind.annotation.RequestBody;
// import org.springframework.web.bind.annotation.RequestMapping;
// import org.springframework.web.bind.annotation.RestController;

// import com.smartparking.apartment.dto.OtpRequest;
// import com.smartparking.apartment.dto.OtpVerifyRequest;
// import com.smartparking.apartment.service.OtpService;

// import jakarta.validation.Valid;

// /**
//  * POST /api/otp/send -> generate + send a 6-digit code
//  * POST /api/otp/verify -> check the code the user typed
//  *
//  * The frontend (src/api/api.js) already has matching fetch calls written and
//  * commented out — uncomment them to switch off the browser-side stub.
//  */
// @RestController
// @RequestMapping("/api/otp")
// public class OtpController {

//     @Autowired
//     private OtpService otpService;

//     @PostMapping("/send")
//     public ResponseEntity<Map<String, Object>> send(@Valid @RequestBody OtpRequest request) {
//         Map<String, Object> body = new HashMap<>();
//         try {
//             String devCode = otpService.sendOtp(request.getPhone());
//             body.put("success", true);
//             body.put("phone", request.getPhone());
//             body.put("expiresInSec", 120);
//             if (devCode != null) {
//                 body.put("devCode", devCode);
//             }
//             return ResponseEntity.ok(body);
//         } catch (IllegalStateException e) {
//             body.put("success", false);
//             body.put("message", e.getMessage());
//             return ResponseEntity.status(429).body(body);
//         }
//     }

//     @PostMapping("/verify")
//     public ResponseEntity<Map<String, Object>> verify(@Valid @RequestBody OtpVerifyRequest request) {
//         boolean ok = otpService.verifyOtp(request.getPhone(), request.getCode());
//         Map<String, Object> body = new HashMap<>();
//         body.put("success", ok);
//         if (!ok) {
//             body.put("message", "Wrong or expired code. Send a new one.");
//         }
//         return ResponseEntity.ok(body);
//     }
// }



package com.smartparking.apartment.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smartparking.apartment.dto.OtpRequest;
import com.smartparking.apartment.dto.OtpVerifyRequest;
import com.smartparking.apartment.service.MessageCentralOtpService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/otp")
public class OtpController {

    // REAL SMS OTP SERVICE
    private final MessageCentralOtpService messageCentralOtpService;

    // OLD MOCK SERVICE — no longer injected.
    // @Autowired
    // private OtpService otpService;

    public OtpController(
            MessageCentralOtpService messageCentralOtpService) {
        this.messageCentralOtpService = messageCentralOtpService;
    }

    // =========================================
    // SEND REAL SMS OTP
    // POST /api/otp/send
    // =========================================

    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> send(
            @Valid @RequestBody OtpRequest request) {

        Map<String, Object> body = new HashMap<>();

        try {
            messageCentralOtpService.sendOtp(request.getPhone());

            body.put("success", true);
            body.put("phone", request.getPhone());
            body.put("expiresInSec", 120);
            body.put("message", "OTP sent successfully.");

            // Never return the actual OTP to the frontend.
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put(
                "message",
                "Unable to send OTP right now. Please try again."
            );

            return ResponseEntity
                    .status(HttpStatus.BAD_GATEWAY)
                    .body(body);
        }
    }

    // =========================================
    // VERIFY REAL SMS OTP
    // POST /api/otp/verify
    // =========================================

    @PostMapping("/verify")
    public ResponseEntity<Map<String, Object>> verify(
            @Valid @RequestBody OtpVerifyRequest request) {

        Map<String, Object> body = new HashMap<>();

        try {
            boolean verified = messageCentralOtpService.verifyOtp(
                    request.getPhone(),
                    request.getCode()
            );

            body.put("success", verified);

            if (verified) {
                body.put("phone", request.getPhone());
                body.put("message", "OTP verified successfully.");

                return ResponseEntity.ok(body);
            }

            body.put(
                "message",
                "Wrong or expired OTP. Please check the code or request a new one."
            );

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put(
                "message",
                "OTP verification is temporarily unavailable. Please try again."
            );

            return ResponseEntity
                    .status(HttpStatus.BAD_GATEWAY)
                    .body(body);
        }
    }

    /*
     * OLD MOCK OTP CONTROLLER LOGIC — preserved for reference.
     *
     * Previously, send() called:
     * otpService.sendOtp(request.getPhone());
     *
     * The old implementation could return devCode in the response.
     * Previously, verify() called:
     * otpService.verifyOtp(request.getPhone(), request.getCode());
     *
     * The old mock flow is not used by this controller anymore.
     */
}
