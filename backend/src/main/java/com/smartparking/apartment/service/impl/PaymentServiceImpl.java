package com.smartparking.apartment.service.impl;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.smartparking.apartment.dto.PaymentOrderRequest;
import com.smartparking.apartment.dto.PaymentOrderResponse;
import com.smartparking.apartment.dto.PaymentRequest;
import com.smartparking.apartment.entity.Booking;
import com.smartparking.apartment.entity.Payment;
import com.smartparking.apartment.repository.BookingRepository;
import com.smartparking.apartment.repository.PaymentRepository;
import com.smartparking.apartment.service.PaymentService;
import com.smartparking.apartment.service.SlotService;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.NoSuchElementException;

@Service
public class PaymentServiceImpl implements PaymentService {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private SlotService slotService;

    @Autowired
    private RazorpayClient razorpayClient;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    // ₹50 parking fee
    private static final int AMOUNT_IN_PAISE = 5000;

    @Override
    @Transactional
    public PaymentOrderResponse createOrder(PaymentOrderRequest request) {

        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() ->
                        new NoSuchElementException(
                                "No such booking: " + request.getBookingId()));

        try {
            // Razorpay amount is in paise
            JSONObject orderRequest = new JSONObject();

            orderRequest.put("amount", AMOUNT_IN_PAISE);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", booking.getBookingId());

            Order razorpayOrder = razorpayClient.orders.create(orderRequest);

            String razorpayOrderId = razorpayOrder.get("id");

            // Save payment record in PostgreSQL
            Payment payment = new Payment(
                    booking.getBookingId(),
                    BigDecimal.valueOf(50),
                    "RAZORPAY"
            );

            payment.setRazorpayOrderId(razorpayOrderId);
            payment.setStatus(Payment.Status.CREATED);

            paymentRepository.save(payment);

            return new PaymentOrderResponse(
                    razorpayOrderId,
                    razorpayKeyId,
                    booking.getBookingId(),
                    AMOUNT_IN_PAISE,
                    "INR"
            );

        } catch (Exception e) {
            throw new RuntimeException(
                    "Failed to create Razorpay order: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public Booking processDummyPayment(PaymentRequest request) {

        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() ->
                        new NoSuchElementException(
                                "No such booking: " + request.getBookingId()));

        // Dummy payment remains temporarily.
        booking.setStatus(Booking.Status.CONFIRMED);
        bookingRepository.save(booking);

        slotService.markOccupied(booking.getSlotId());

        return booking;
    }
}