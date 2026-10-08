package com.smartparking.apartment.service;

import com.smartparking.apartment.dto.PaymentOrderRequest;
import com.smartparking.apartment.dto.PaymentOrderResponse;
import com.smartparking.apartment.dto.PaymentRequest;
import com.smartparking.apartment.dto.PaymentVerifyRequest;
import com.smartparking.apartment.entity.Booking;

public interface PaymentService {

    Booking processDummyPayment(PaymentRequest request);

    PaymentOrderResponse createOrder(PaymentOrderRequest request);

    Booking verifyPayment(PaymentVerifyRequest request);
}