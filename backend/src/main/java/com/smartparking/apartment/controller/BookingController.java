package com.smartparking.apartment.controller;

import com.smartparking.apartment.dto.BookingRequest;
import com.smartparking.apartment.entity.Booking;
import com.smartparking.apartment.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * POST /api/bookings                  -> create a booking from the BookingForm page
 * GET  /api/bookings/{id}             -> fetch a booking (used on the confirmation page)
 * GET  /api/bookings/history/{phone}  -> a phone number's past bookings, newest first
 *                                         (shown once the number is OTP-verified)
 */
@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired
    private BookingService bookingService;

    @PostMapping
    public ResponseEntity<Booking> createBooking(@Valid @RequestBody BookingRequest request) {
        return ResponseEntity.ok(bookingService.createBooking(request));
    }

    @GetMapping("/{bookingId}")
    public ResponseEntity<Booking> getBooking(@PathVariable String bookingId) {
        Booking booking = bookingService.getBooking(bookingId);
        return booking != null ? ResponseEntity.ok(booking) : ResponseEntity.notFound().build();
    }

    @GetMapping("/history/{phone}")
    public ResponseEntity<List<Booking>> getHistory(@PathVariable String phone) {
        return ResponseEntity.ok(bookingService.getBookingsByPhone(phone));
    }

}