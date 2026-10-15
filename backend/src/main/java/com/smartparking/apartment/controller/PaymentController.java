// package com.smartparking.apartment.controller;

// import java.util.NoSuchElementException;

// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.http.ResponseEntity;
// import org.springframework.web.bind.annotation.PostMapping;
// import org.springframework.web.bind.annotation.RequestBody;
// import org.springframework.web.bind.annotation.RequestMapping;
// import org.springframework.web.bind.annotation.RestController;

// import com.smartparking.apartment.dto.PaymentOrderRequest;
// import com.smartparking.apartment.dto.PaymentOrderResponse;
// import com.smartparking.apartment.dto.PaymentRequest;
// import com.smartparking.apartment.dto.PaymentVerifyRequest;
// import com.smartparking.apartment.entity.Booking;
// import com.smartparking.apartment.service.PaymentService;

// import jakarta.validation.Valid;

// @RestController
// @RequestMapping("/api/payments")
// public class PaymentController {

//     @Autowired
//     private PaymentService paymentService;

//     // Create Razorpay order
//     @PostMapping("/order")
//     public ResponseEntity<PaymentOrderResponse> createOrder(
//             @Valid @RequestBody PaymentOrderRequest request) {

//         try {

//             return ResponseEntity.ok(
//                     paymentService.createOrder(request)
//             );

//         } catch (NoSuchElementException e) {

//             return ResponseEntity.notFound().build();

//         } catch (RuntimeException e) {

//             return ResponseEntity.internalServerError().build();
//         }
//     }

//     // Verify Razorpay payment
//     @PostMapping("/verify")
//     public ResponseEntity<Booking> verifyPayment(
//             @Valid @RequestBody PaymentVerifyRequest request) {

//         try {

//             return ResponseEntity.ok(
//                     paymentService.verifyPayment(request)
//             );

//         } catch (NoSuchElementException e) {

//             return ResponseEntity.notFound().build();

//         } catch (IllegalArgumentException e) {

//             return ResponseEntity.badRequest().build();
//         }
//     }

//     // Old dummy endpoint - keep temporarily
//     @PostMapping
//     public ResponseEntity<Booking> pay(
//             @Valid @RequestBody PaymentRequest request) {

//         try {

//             return ResponseEntity.ok(
//                     paymentService.processDummyPayment(request)
//             );

//         } catch (NoSuchElementException e) {

//             return ResponseEntity.notFound().build();
//         }
//     }
// }

package com.smartparking.apartment.controller;

import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.smartparking.apartment.dto.*;
import com.smartparking.apartment.entity.Booking;
import com.smartparking.apartment.service.PaymentService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    @Autowired private PaymentService paymentService;

    @PostMapping("/order")
    public ResponseEntity<?> createOrder(@Valid @RequestBody PaymentOrderRequest request) {
        try { return ResponseEntity.ok(paymentService.createOrder(request)); }
        catch (NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("message", e.getMessage())); }
        catch (IllegalStateException | IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("message", e.getMessage())); }
        catch (RuntimeException e) { return ResponseEntity.internalServerError().body(Map.of("message", "Failed to create payment order")); }
    }

    @PostMapping("/extension/order")
    public ResponseEntity<?> createExtensionOrder(@Valid @RequestBody PaymentOrderRequest request) {
        try { return ResponseEntity.ok(paymentService.createExtensionOrder(request)); }
        catch (NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("message", e.getMessage())); }
        catch (IllegalStateException | IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("message", e.getMessage())); }
        catch (RuntimeException e) { return ResponseEntity.internalServerError().body(Map.of("message", "Failed to create extension payment order")); }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(@Valid @RequestBody PaymentVerifyRequest request) {
        try { return ResponseEntity.ok(paymentService.verifyPayment(request)); }
        catch (NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("message", e.getMessage())); }
        catch (IllegalArgumentException | IllegalStateException e) { return ResponseEntity.badRequest().body(Map.of("message", e.getMessage())); }
    }

    @PostMapping
    public ResponseEntity<?> pay(@Valid @RequestBody PaymentRequest request) {
        try { return ResponseEntity.ok(paymentService.processDummyPayment(request)); }
        catch (NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("message", e.getMessage())); }
    }
}
