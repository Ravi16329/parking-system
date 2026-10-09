package com.smartparking.apartment.service.impl;

import java.time.LocalDateTime;
import java.util.NoSuchElementException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartparking.apartment.dto.QrResponse;
import com.smartparking.apartment.entity.Booking;
import com.smartparking.apartment.entity.ParkingQr;
import com.smartparking.apartment.repository.BookingRepository;
import com.smartparking.apartment.repository.ParkingQrRepository;
import com.smartparking.apartment.service.QrService;

@Service
public class QrServiceImpl implements QrService {

@Autowired
private ParkingQrRepository parkingQrRepository;

@Autowired
private BookingRepository bookingRepository;

@Override
@Transactional
public QrResponse generateQr(String bookingId) {

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() ->
                        new NoSuchElementException(
                                "Booking not found: " + bookingId));

        // QR can only be generated after successful payment
        if (booking.getStatus() != Booking.Status.CONFIRMED) {
            throw new IllegalStateException(
                    "QR can only be generated for a confirmed booking");
        }

        // Do not generate another QR for the same booking
        ParkingQr existing =
                parkingQrRepository.findByBookingId(bookingId)
                        .orElse(null);

        if (existing != null) {

            return new QrResponse(
                    existing.getQrId(),
                    existing.getToken(),
                    existing.getBookingId(),
                    existing.getStatus().name()
            );
        }

        ParkingQr qr = new ParkingQr(bookingId);

        parkingQrRepository.save(qr);

        return new QrResponse(
                qr.getQrId(),
                qr.getToken(),
                qr.getBookingId(),
                qr.getStatus().name()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public QrResponse getQrByBooking(String bookingId) {

        ParkingQr qr = parkingQrRepository
                .findByBookingId(bookingId)
                .orElseThrow(() ->
                        new NoSuchElementException(
                                "QR not found for booking: " + bookingId));

        return new QrResponse(
                qr.getQrId(),
                qr.getToken(),
                qr.getBookingId(),
                qr.getStatus().name()
        );
    }


@Override
@Transactional
public QrResponse verifyQr(String token) {

    ParkingQr qr = parkingQrRepository
            .findByTokenForUpdate(token)
            .orElseThrow(() ->
                    new NoSuchElementException("Invalid QR code"));

    if (qr.getStatus() != ParkingQr.Status.ACTIVE) {
        throw new IllegalStateException(
                "QR code has already been used or expired");
    }

    qr.setStatus(ParkingQr.Status.USED);
    qr.setUsedAt(LocalDateTime.now());

    parkingQrRepository.save(qr);

    return new QrResponse(
            qr.getQrId(),
            qr.getToken(),
            qr.getBookingId(),
            qr.getStatus().name()
    );
}

}