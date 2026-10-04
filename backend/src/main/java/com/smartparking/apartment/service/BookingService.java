package com.smartparking.apartment.service;

import com.smartparking.apartment.dto.BookingRequest;
import com.smartparking.apartment.entity.Booking;

import java.util.List;

public interface BookingService {

    /**
     * Creates a new booking record (status HELD) for the given slot + user
     * details, with a freshly generated booking ID. The slot itself is
     * already HELD server-side by the time this runs (SlotController's
     * /hold ran when the user clicked the bay) — this just records who
     * that hold belongs to.
     */
    Booking createBooking(BookingRequest request);

    /** Looks up a booking by its ID, or null if it doesn't exist. */
    Booking getBooking(String bookingId);

    /** All bookings for a phone number, newest first — for "previous bookings". */
    List<Booking> getBookingsByPhone(String phone);

}