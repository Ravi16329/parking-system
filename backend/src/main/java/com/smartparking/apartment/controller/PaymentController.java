package com.smartparking.apartment.controller;

import java.util.NoSuchElementException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smartparking.apartment.dto.PaymentOrderRequest;
import com.smartparking.apartment.dto.PaymentOrderResponse;
import com.smartparking.apartment.dto.PaymentRequest;
import com.smartparking.apartment.entity.Booking;
import com.smartparking.apartment.service.PaymentService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    // Create Razorpay order
    @PostMapping("/order")
    public ResponseEntity<PaymentOrderResponse> createOrder(
            @Valid @RequestBody PaymentOrderRequest request) {

        try {
            return ResponseEntity.ok(
                    paymentService.createOrder(request)
            );

        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();

        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // Old dummy payment endpoint - kept temporarily
    @PostMapping
    public ResponseEntity<Booking> pay(
            @Valid @RequestBody PaymentRequest request) {

        try {
            return ResponseEntity.ok(
                    paymentService.processDummyPayment(request)
            );

        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }
}