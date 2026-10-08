package com.smartparking.apartment.service;

import com.smartparking.apartment.dto.PaymentRequest;
import com.smartparking.apartment.entity.Booking;

import com.smartparking.apartment.dto.PaymentOrderRequest;
import com.smartparking.apartment.dto.PaymentOrderResponse;

public interface PaymentService {

    /**
     * Simulates a payment for the given booking and, on "success",
     * confirms the booking and marks its slot OCCUPIED.
     * TODO: implement dummy payment logic (always succeed for now, or
     * add random success/failure once you're ready).
     */
    Booking processDummyPayment(PaymentRequest request);

    PaymentOrderResponse createOrder(PaymentOrderRequest request);

}
