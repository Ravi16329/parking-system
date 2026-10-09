package com.smartparking.apartment.service;

import com.smartparking.apartment.dto.QrResponse;

public interface QrService {

    QrResponse generateQr(String bookingId);

    QrResponse getQrByBooking(String bookingId);

    QrResponse verifyQr(String token);

    QrResponse verifyEntry(String token);

    QrResponse verifyExit(String token);
}