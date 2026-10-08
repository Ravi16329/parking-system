package com.smartparking.apartment.controller;

import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smartparking.apartment.dto.AdminBookingRequest;
import com.smartparking.apartment.entity.Booking;
import com.smartparking.apartment.exception.SlotUnavailableException;
import com.smartparking.apartment.repository.BookingRepository;
import com.smartparking.apartment.service.SlotService;

import jakarta.validation.Valid;

/**
 * Admin-only slot actions (protected by AdminAuthFilter, see security/).
 * - release: a HELD slot someone abandoned, or an OCCUPIED slot whose car left.
 * - book: a walk-in driver with no online booking; the admin collects payment
 *   and assigns a free bay.
 */
@RestController
@RequestMapping("/api/admin/slots")
public class AdminSlotController {

    @Autowired
    private SlotService slotService;

    @Autowired
    private BookingRepository bookingRepository;

    @PostMapping("/{slotId}/release")
    @Transactional
    public ResponseEntity<Void> forceRelease(@PathVariable String slotId) {
        try {
            slotService.releaseSlot(slotId);
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }

        // If this was a HELD slot with a dangling booking (someone picked it
        // but never paid), cancel that booking too so it doesn't sit in their
        // history forever as "held". A CONFIRMED booking on a freed OCCUPIED
        // slot is left alone: it's a legitimate record of a past, paid stay.
        bookingRepository.findFirstBySlotIdAndStatusOrderByCreatedAtDesc(slotId, Booking.Status.HELD)
                .ifPresent(b -> {
                    b.setStatus(Booking.Status.CANCELLED);
                    bookingRepository.save(b);
                });

        return ResponseEntity.ok().build();
    }

    @PostMapping("/{slotId}/book")
    public ResponseEntity<?> bookWalkIn(@PathVariable String slotId,
                                        @Valid @RequestBody AdminBookingRequest req) {
        try {
            return ResponseEntity.ok(slotService.adminBookSlot(slotId, req.getName().trim(), req.getPhone()));
        } catch (SlotUnavailableException e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }
}