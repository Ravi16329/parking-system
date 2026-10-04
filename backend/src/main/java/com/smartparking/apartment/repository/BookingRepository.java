package com.smartparking.apartment.repository;

import com.smartparking.apartment.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, String> {

    /** Newest first, for a phone number's "previous bookings" list. */
    List<Booking> findByPhoneOrderByCreatedAtDesc(String phone);

    /** The most recent booking for a slot in a given status — used by admin
     *  force-release to find a dangling HELD booking to cancel, if any. */
    Optional<Booking> findFirstBySlotIdAndStatusOrderByCreatedAtDesc(String slotId, Booking.Status status);
}
