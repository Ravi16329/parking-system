package com.smartparking.apartment.service.impl;

import com.smartparking.apartment.dto.BookingRequest;
import com.smartparking.apartment.entity.Booking;
import com.smartparking.apartment.repository.BookingRepository;
import com.smartparking.apartment.service.BookingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class BookingServiceImpl implements BookingService {

    @Autowired
    private BookingRepository bookingRepository;

    @Override
    @Transactional
    public Booking createBooking(BookingRequest request) {
        String bookingId = "BK" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Booking booking = new Booking(
                bookingId,
                request.getSlotId(),
                request.getName(),
                request.getPhone(),
                Booking.Status.HELD,
                LocalDateTime.now());
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