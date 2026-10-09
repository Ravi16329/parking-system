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
import com.smartparking.apartment.service.SlotService;

@Service
public class QrServiceImpl implements QrService {

@Autowired
private ParkingQrRepository parkingQrRepository;

@Autowired
private BookingRepository bookingRepository;

@Autowired
private SlotService slotService;

@Override
@Transactional
public QrResponse generateQr(String bookingId) {

    Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() ->
                    new NoSuchElementException("Booking not found: " + bookingId));

    if (booking.getStatus() != Booking.Status.CONFIRMED) {
        throw new IllegalStateException(
                "QR can only be generated for a confirmed booking");
    }

    ParkingQr existing = parkingQrRepository.findByBookingId(bookingId)
            .orElse(null);

    if (existing != null) {
        return toResponse(existing);
    }

    ParkingQr qr = new ParkingQr(bookingId);
    parkingQrRepository.save(qr);

    return toResponse(qr);
}

@Override
@Transactional(readOnly = true)
public QrResponse getQrByBooking(String bookingId) {

    ParkingQr qr = parkingQrRepository.findByBookingId(bookingId)
            .orElseThrow(() ->
                    new NoSuchElementException(
                            "QR not found for booking: " + bookingId));

    return toResponse(qr);
}

@Override
@Transactional
public QrResponse verifyEntry(String token) {

    ParkingQr qr = parkingQrRepository.findByTokenForUpdate(token)
            .orElseThrow(() ->
                    new NoSuchElementException("Invalid QR code"));

    if (qr.getStatus() != ParkingQr.Status.ACTIVE) {
        throw new IllegalStateException(
                "Entry denied. QR must be ACTIVE. Current status: "
                        + qr.getStatus());
    }

    Booking booking = bookingRepository.findById(qr.getBookingId())
            .orElseThrow(() ->
                    new NoSuchElementException("Booking not found"));

    if (booking.getStatus() != Booking.Status.CONFIRMED) {
        throw new IllegalStateException(
                "Entry denied. Booking is not confirmed");
    }

    qr.setStatus(ParkingQr.Status.PARKED);
    qr.setEntryAt(LocalDateTime.now());

    parkingQrRepository.save(qr);

    return toResponse(qr);
}

@Override
@Transactional
public QrResponse verifyExit(String token) {

    ParkingQr qr = parkingQrRepository.findByTokenForUpdate(token)
            .orElseThrow(() ->
                    new NoSuchElementException("Invalid QR code"));

    if (qr.getStatus() != ParkingQr.Status.PARKED) {
        throw new IllegalStateException(
                "Exit denied. The vehicle must enter first. Current status: "
                        + qr.getStatus());
    }

    Booking booking = bookingRepository.findById(qr.getBookingId())
            .orElseThrow(() ->
                    new NoSuchElementException("Booking not found"));

    if (booking.getStatus() != Booking.Status.CONFIRMED) {
        throw new IllegalStateException(
                "Exit denied. Booking is not confirmed");
    }

    // Release the exact slot associated with this booking.
    slotService.releaseOccupiedSlot(booking.getSlotId());

    qr.setStatus(ParkingQr.Status.USED);
    qr.setExitAt(LocalDateTime.now());
    qr.setUsedAt(LocalDateTime.now());

    parkingQrRepository.save(qr);

    return toResponse(qr);
}

// Kept for compatibility with code that still calls verifyQr().
// Update the controller to use verifyEntry() or verifyExit().
@Override
@Transactional
public QrResponse verifyQr(String token) {
    return verifyEntry(token);
}

private QrResponse toResponse(ParkingQr qr) {
    return new QrResponse(
            qr.getQrId(),
            qr.getToken(),
            qr.getBookingId(),
            qr.getStatus().name()
    );
}

}