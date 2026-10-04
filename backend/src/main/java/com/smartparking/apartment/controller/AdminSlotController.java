package com.smartparking.apartment.controller;

import com.smartparking.apartment.entity.Booking;
import com.smartparking.apartment.repository.BookingRepository;
import com.smartparking.apartment.service.SlotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.NoSuchElementException;

/**
 * Admin-only slot actions (protected by AdminAuthFilter, see security/).
 * One endpoint covers both cases the admin needs: a HELD slot someone
 * abandoned mid-booking, and an OCCUPIED slot whose car has actually left —
 * both just need to go back to AVAILABLE.
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
        // slot is left alone — it's a legitimate record of a past, paid stay.
        bookingRepository.findFirstBySlotIdAndStatusOrderByCreatedAtDesc(slotId, Booking.Status.HELD)
                .ifPresent(b -> {
                    b.setStatus(Booking.Status.CANCELLED);
                    bookingRepository.save(b);
                });

        return ResponseEntity.ok().build();
    }
}
