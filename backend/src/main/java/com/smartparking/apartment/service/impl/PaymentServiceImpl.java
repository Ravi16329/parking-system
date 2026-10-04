package com.smartparking.apartment.service.impl;

import com.smartparking.apartment.dto.PaymentRequest;
import com.smartparking.apartment.entity.Booking;
import com.smartparking.apartment.repository.BookingRepository;
import com.smartparking.apartment.service.PaymentService;
import com.smartparking.apartment.service.SlotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;

/**
 * Dummy payment gateway — always "succeeds". Swap the body of
 * processDummyPayment for a real Razorpay order-verify call when that's
 * wired in: create the order in PaymentController (or a new endpoint) before
 * checkout opens, then here verify the returned razorpay_payment_id /
 * razorpay_signature instead of unconditionally confirming.
 */
@Service
public class PaymentServiceImpl implements PaymentService {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private SlotService slotService;

    @Override
    @Transactional
    public Booking processDummyPayment(PaymentRequest request) {
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new NoSuchElementException("No such booking: " + request.getBookingId()));

        // ---- Razorpay goes here later -------------------------------------
        // e.g. RazorpayClient client = new RazorpayClient(keyId, keySecret);
        // Utils.verifyPaymentSignature(params, keySecret); // throws if invalid
        // For now: dummy gateway, always succeeds.
        // ---------------------------------------------------------------------

        booking.setStatus(Booking.Status.CONFIRMED);
        bookingRepository.save(booking);

        // Marks the slot OCCUPIED and clears its hold timer, so it isn't
        // swept back to AVAILABLE by the hold-timeout job.
        slotService.markOccupied(booking.getSlotId());

        return booking;
    }

}