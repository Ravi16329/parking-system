package com.smartparking.apartment.controller;

import java.util.NoSuchElementException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smartparking.apartment.dto.QrResponse;
import com.smartparking.apartment.service.QrService;

@RestController
@RequestMapping("/api/qr")
public class QrController {

    @Autowired
    private QrService qrService;

    // Generate QR for confirmed booking
    @PostMapping("/generate/{bookingId}")
    public ResponseEntity<QrResponse> generateQr(
            @PathVariable String bookingId) {

        try {

            return ResponseEntity.ok(
                    qrService.generateQr(bookingId)
            );

        } catch (NoSuchElementException e) {

            return ResponseEntity.notFound().build();

        } catch (IllegalStateException e) {

            return ResponseEntity.badRequest().build();
        }
    }

    // Get QR for confirmation page
    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<QrResponse> getQrByBooking(
            @PathVariable String bookingId) {

        try {

            return ResponseEntity.ok(
                    qrService.getQrByBooking(bookingId)
            );

        } catch (NoSuchElementException e) {

            return ResponseEntity.notFound().build();
        }
    }

    // Verify one-time QR
    @PostMapping("/verify")
    public ResponseEntity<QrResponse> verifyQr(
            @RequestParam String token) {

        try {

            return ResponseEntity.ok(
                    qrService.verifyQr(token)
            );

        } catch (NoSuchElementException e) {

            return ResponseEntity.notFound().build();

        } catch (IllegalStateException e) {

            return ResponseEntity.badRequest().build();
        }
    }
}