package com.smartparking.apartment.controller;

import com.smartparking.apartment.dto.PaymentRequest;
import com.smartparking.apartment.entity.Booking;
import com.smartparking.apartment.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.NoSuchElementException;

/**
 * POST /api/payments -> simulate a dummy payment for a booking (UPI/Card).
 * Dummy for now — swap PaymentServiceImpl's body for a real Razorpay
 * order-verify call when that's wired in; this endpoint's contract
 * (booking in, confirmed booking out) doesn't need to change.
 */
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @PostMapping
    public ResponseEntity<Booking> pay(@Valid @RequestBody PaymentRequest request) {
        try {
            return ResponseEntity.ok(paymentService.processDummyPayment(request));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

}