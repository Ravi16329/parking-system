// package com.smartparking.apartment.service.impl;

// import com.smartparking.apartment.dto.BookingRequest;
// import com.smartparking.apartment.entity.Booking;
// import com.smartparking.apartment.repository.BookingRepository;
// import com.smartparking.apartment.service.BookingService;
// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.stereotype.Service;
// import org.springframework.transaction.annotation.Transactional;

// import java.time.LocalDateTime;
// import java.util.List;
// import java.util.UUID;

// @Service
// public class BookingServiceImpl implements BookingService {

//     @Autowired
//     private BookingRepository bookingRepository;

//     @Override
//     @Transactional
//     public Booking createBooking(BookingRequest request) {
//         String bookingId = "BK" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
//         Booking booking = new Booking(
//                 bookingId,
//                 request.getSlotId(),
//                 request.getName(),
//                 request.getPhone(),
//                 Booking.Status.HELD,
//                 LocalDateTime.now());
//         return bookingRepository.save(booking);
//     }

//     @Override
//     public Booking getBooking(String bookingId) {
//         return bookingRepository.findById(bookingId).orElse(null);
//     }

//     @Override
//     public List<Booking> getBookingsByPhone(String phone) {
//         return bookingRepository.findByPhoneOrderByCreatedAtDesc(phone);
//     }

// }

package com.smartparking.apartment.service.impl;

import java.math.BigDecimal;
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
    private static final BigDecimal HOURLY_RATE = BigDecimal.valueOf(50);
    @Autowired private BookingRepository bookingRepository;

    @Override @Transactional
    public Booking createBooking(BookingRequest request) {
        int hours = request.getDurationHours();
        if (hours < 1) throw new IllegalArgumentException("Duration must be at least one hour");
        String bookingId = "BK" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Booking booking = new Booking(bookingId, request.getSlotId(), request.getName(), request.getPhone(),
                Booking.Status.HELD, LocalDateTime.now());
        booking.setDurationHours(hours);
        booking.setAmount(HOURLY_RATE.multiply(BigDecimal.valueOf(hours)));
        return bookingRepository.save(booking);
    }
    @Override public Booking getBooking(String bookingId) {
        return bookingRepository.findById(bookingId).orElse(null);
    }
    @Override public List<Booking> getBookingsByPhone(String phone) {
        return bookingRepository.findByPhoneOrderByCreatedAtDesc(phone);
    }
}
