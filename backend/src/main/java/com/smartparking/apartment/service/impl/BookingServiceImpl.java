
package com.smartparking.apartment.service.impl;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartparking.apartment.dto.BookingRequest;
import com.smartparking.apartment.entity.Booking;
import com.smartparking.apartment.repository.BookingRepository;
import com.smartparking.apartment.service.BookingService;

@Service
public class BookingServiceImpl implements BookingService {

    private static final BigDecimal HOURLY_RATE =
            BigDecimal.valueOf(50);

    @Autowired
    private BookingRepository bookingRepository;

    @Override
    @Transactional
    public Booking createBooking(BookingRequest request) {

        LocalDateTime start = request.getScheduledStartAt();
        LocalDateTime end = request.getScheduledEndAt();
        LocalDateTime now = LocalDateTime.now();

        if (start == null || end == null) {
            throw new IllegalArgumentException(
                    "Select both parking start and end times");
        }

        LocalDate today = LocalDate.now();

        if (!start.toLocalDate().equals(today)
                || !end.toLocalDate().equals(today)) {
            throw new IllegalArgumentException(
                    "Parking can only be booked for today");
        }

        if (start.isBefore(now)) {
            throw new IllegalArgumentException(
                    "Start time cannot be in the past");
        }

        if (!end.isAfter(start)) {
            throw new IllegalArgumentException(
                    "End time must be after start time");
        }

        long minutes = Duration.between(start, end).toMinutes();

        if (minutes % 60 != 0) {
            throw new IllegalArgumentException(
                    "Parking duration must be in whole hours");
        }

        int hours = Math.toIntExact(minutes / 60);

        if (hours < 1) {
            throw new IllegalArgumentException(
                    "Select at least one hour of parking");
        }

        String bookingId =
                "BK" + UUID.randomUUID()
                        .toString()
                        .substring(0, 8)
                        .toUpperCase();

        Booking booking = new Booking(
                bookingId,
                request.getSlotId(),
                request.getName(),
                request.getPhone(),
                Booking.Status.HELD,
                now
        );

        booking.setScheduledStartAt(start);
        booking.setScheduledEndAt(end);
        booking.setDurationHours(hours);
        booking.setAmount(
                HOURLY_RATE.multiply(BigDecimal.valueOf(hours))
        );

        return bookingRepository.save(booking);
    }

    @Override
    public Booking getBooking(String bookingId) {
        return bookingRepository.findById(bookingId).orElse(null);
    }

    @Override
    public List<Booking> getBookingsByPhone(String phone) {
        return bookingRepository.findByPhoneOrderByCreatedAtDesc(phone);
    }
}
