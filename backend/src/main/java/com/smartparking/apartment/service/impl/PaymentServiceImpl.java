
package com.smartparking.apartment.service.impl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.NoSuchElementException;

import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.Utils;
import com.smartparking.apartment.dto.PaymentOrderRequest;
import com.smartparking.apartment.dto.PaymentOrderResponse;
import com.smartparking.apartment.dto.PaymentRequest;
import com.smartparking.apartment.dto.PaymentVerifyRequest;
import com.smartparking.apartment.entity.Booking;
import com.smartparking.apartment.entity.ParkingQr;
import com.smartparking.apartment.entity.Payment;
import com.smartparking.apartment.repository.BookingRepository;
import com.smartparking.apartment.repository.ParkingQrRepository;
import com.smartparking.apartment.repository.PaymentRepository;
import com.smartparking.apartment.service.PaymentService;
import com.smartparking.apartment.service.QrService;
import com.smartparking.apartment.service.SlotService;

@Service
public class PaymentServiceImpl implements PaymentService {

    private static final BigDecimal HOURLY_RATE =
            BigDecimal.valueOf(50);

    private static final int PAISE_PER_RUPEE = 100;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private ParkingQrRepository parkingQrRepository;

    @Autowired
    private SlotService slotService;

    @Autowired
    private RazorpayClient razorpayClient;

    @Autowired
    private QrService qrService;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;


    // --------------------------------------------------
    // 1. CREATE INITIAL BOOKING PAYMENT ORDER
    // --------------------------------------------------

    @Override
    @Transactional
    public PaymentOrderResponse createOrder(
            PaymentOrderRequest request) {

        Booking booking = bookingRepository
                .findById(request.getBookingId())
                .orElseThrow(() -> new NoSuchElementException(
                        "No such booking: " + request.getBookingId()));

        if (booking.getStatus() != Booking.Status.HELD) {
            throw new IllegalStateException(
                    "This booking is not awaiting its initial payment.");
        }

        if (booking.getScheduledStartAt() == null
                || booking.getScheduledEndAt() == null) {
            throw new IllegalStateException(
                    "The selected parking start and end times are missing.");
        }

        if (booking.getDurationHours() == null
                || booking.getDurationHours() < 1) {
            throw new IllegalStateException(
                    "The parking duration is invalid.");
        }

        // Calculate the payment amount from the saved booking duration.
        BigDecimal amount = HOURLY_RATE.multiply(
                BigDecimal.valueOf(booking.getDurationHours()));

        // The saved booking amount must match the calculated amount.
        if (booking.getAmount() == null
                || booking.getAmount().compareTo(amount) != 0) {
            throw new IllegalStateException(
                    "The booking amount does not match the selected duration.");
        }

        return createRazorpayOrder(
                booking,
                amount,
                Payment.Type.BOOKING,
                null
        );
    }


    // --------------------------------------------------
    // 2. CREATE PARKING EXTENSION PAYMENT ORDER
    // --------------------------------------------------

    @Override
    @Transactional
    public PaymentOrderResponse createExtensionOrder(
            PaymentOrderRequest request) {

        Booking booking = bookingRepository
                .findById(request.getBookingId())
                .orElseThrow(() -> new NoSuchElementException(
                        "No such booking: " + request.getBookingId()));

        int extraHours = request.getExtraHours() == null
                ? 0
                : request.getExtraHours();

        if (extraHours < 1) {
            throw new IllegalArgumentException(
                    "Select at least one extra hour.");
        }

        if (booking.getStatus() != Booking.Status.CONFIRMED) {
            throw new IllegalStateException(
                    "Only confirmed bookings can be extended.");
        }

        ParkingQr qr = parkingQrRepository
                .findByBookingId(booking.getBookingId())
                .orElse(null);

        if (qr == null
                || (qr.getStatus() != ParkingQr.Status.ACTIVE
                && qr.getStatus() != ParkingQr.Status.PARKED)) {
            throw new IllegalStateException(
                    "This booking can no longer be extended because "
                    + "its parking QR is no longer active.");
        }

        BigDecimal amount = HOURLY_RATE.multiply(
                BigDecimal.valueOf(extraHours));

        return createRazorpayOrder(
                booking,
                amount,
                Payment.Type.EXTENSION,
                extraHours
        );
    }


    // --------------------------------------------------
    // 3. CREATE AND SAVE A RAZORPAY ORDER
    // --------------------------------------------------

    private PaymentOrderResponse createRazorpayOrder(
            Booking booking,
            BigDecimal amount,
            Payment.Type type,
            Integer extraHours) {

        try {
            int amountPaise = amount
                    .multiply(BigDecimal.valueOf(PAISE_PER_RUPEE))
                    .intValueExact();

            JSONObject orderRequest = new JSONObject();

            orderRequest.put("amount", amountPaise);
            orderRequest.put("currency", "INR");

            String receipt = booking.getBookingId();

            if (type == Payment.Type.EXTENSION) {
                receipt += "-EXT-" + System.nanoTime();
            }

            orderRequest.put("receipt", receipt);

            Order razorpayOrder =
                    razorpayClient.orders.create(orderRequest);

            String orderId = razorpayOrder.get("id");

            // Save the payment record before returning the order.
            Payment payment = new Payment(
                    booking.getBookingId(),
                    amount,
                    "RAZORPAY"
            );

            payment.setRazorpayOrderId(orderId);
            payment.setStatus(Payment.Status.CREATED);
            payment.setType(type);
            payment.setExtensionHours(extraHours);

            paymentRepository.save(payment);

            return new PaymentOrderResponse(
                    orderId,
                    razorpayKeyId,
                    booking.getBookingId(),
                    amountPaise,
                    "INR"
            );

        } catch (Exception e) {
            throw new RuntimeException(
                    "Failed to create Razorpay order: "
                    + e.getMessage(),
                    e
            );
        }
    }


    // --------------------------------------------------
    // 4. VERIFY PAYMENT AND UPDATE THE BOOKING
    // --------------------------------------------------

    @Override
    @Transactional
    public Booking verifyPayment(PaymentVerifyRequest request) {

        Booking booking = bookingRepository
                .findById(request.getBookingId())
                .orElseThrow(() -> new NoSuchElementException(
                        "No such booking: " + request.getBookingId()));

        Payment payment = paymentRepository
                .findByRazorpayOrderId(request.getRazorpayOrderId())
                .orElseThrow(() -> new NoSuchElementException(
                        "No payment found for Razorpay order: "
                        + request.getRazorpayOrderId()));

        // Ensure the payment belongs to this booking.
        if (!payment.getBookingId().equals(booking.getBookingId())) {
            throw new IllegalArgumentException(
                    "Payment does not belong to this booking.");
        }

        // A previously successful payment must never be applied twice.
        if (payment.getStatus() == Payment.Status.SUCCESS) {
            return booking;
        }

        if (payment.getStatus() != Payment.Status.CREATED) {
            throw new IllegalStateException(
                    "This payment is not awaiting verification.");
        }

        if (payment.getType() == null) {
            throw new IllegalStateException(
                    "The payment type is missing.");
        }

        // Validate booking state and payment details before applying
        // the payment to the booking.
        if (payment.getType() == Payment.Type.BOOKING) {

            if (booking.getStatus() != Booking.Status.HELD) {
                throw new IllegalStateException(
                        "This booking is not awaiting its initial payment.");
            }

            if (booking.getScheduledStartAt() == null
                    || booking.getScheduledEndAt() == null) {
                throw new IllegalStateException(
                        "The selected parking times are missing.");
            }

            BigDecimal expectedAmount = HOURLY_RATE.multiply(
                    BigDecimal.valueOf(booking.getDurationHours()));

            if (payment.getAmount() == null
                    || payment.getAmount().compareTo(expectedAmount) != 0) {
                throw new IllegalStateException(
                        "The payment amount does not match the booking.");
            }

        } else if (payment.getType() == Payment.Type.EXTENSION) {

            if (booking.getStatus() != Booking.Status.CONFIRMED) {
                throw new IllegalStateException(
                        "Only confirmed bookings can be extended.");
            }

            int extraHours = payment.getExtensionHours() == null
                    ? 0
                    : payment.getExtensionHours();

            if (extraHours < 1) {
                throw new IllegalStateException(
                        "The extension duration is missing.");
            }

            BigDecimal expectedAmount = HOURLY_RATE.multiply(
                    BigDecimal.valueOf(extraHours));

            if (payment.getAmount() == null
                    || payment.getAmount().compareTo(expectedAmount) != 0) {
                throw new IllegalStateException(
                        "The extension payment amount is invalid.");
            }

        } else {
            throw new IllegalStateException(
                    "Unsupported payment type.");
        }

        // Verify the Razorpay signature using the order ID saved
        // in the database, not an untrusted order ID from the client.
        try {
            JSONObject attributes = new JSONObject();

            attributes.put(
                    "razorpay_order_id",
                    payment.getRazorpayOrderId());

            attributes.put(
                    "razorpay_payment_id",
                    request.getRazorpayPaymentId());

            attributes.put(
                    "razorpay_signature",
                    request.getRazorpaySignature());

            Utils.verifyPaymentSignature(
                    attributes,
                    razorpayKeySecret);

        } catch (Exception e) {
            payment.setStatus(Payment.Status.FAILED);
            paymentRepository.save(payment);

            throw new IllegalArgumentException(
                    "Invalid Razorpay payment signature.");
        }

        // Mark the payment successful only after signature verification.
        payment.setStatus(Payment.Status.SUCCESS);
        payment.setTransactionId(request.getRazorpayPaymentId());
        payment.setPaymentTime(LocalDateTime.now());

        paymentRepository.save(payment);

        // INITIAL BOOKING PAYMENT
        if (payment.getType() == Payment.Type.BOOKING) {

            booking.setStatus(Booking.Status.CONFIRMED);

            // Preserve the user's selected start and end times.
            // Do not replace them with the payment completion time.
            booking.setAmount(payment.getAmount());

            Booking savedBooking = bookingRepository.save(booking);

            slotService.markOccupied(savedBooking.getSlotId());

            // Generate the parking QR after the initial payment.
            qrService.generateQr(savedBooking.getBookingId());

            return savedBooking;
        }

        // EXTENSION PAYMENT
        int extraHours = payment.getExtensionHours();

        LocalDateTime scheduledEnd = booking.getScheduledEndAt();
        LocalDateTime now = LocalDateTime.now();

        // If the existing end time has already passed, extend from now.
        if (scheduledEnd == null || scheduledEnd.isBefore(now)) {
            scheduledEnd = now;
        }

        // Add the paid extension to the existing booking.
        booking.setScheduledEndAt(
                scheduledEnd.plusHours(extraHours));

        booking.setDurationHours(
                booking.getDurationHours() + extraHours);

        booking.setAmount(
                booking.getAmount().add(payment.getAmount()));

        // Do not generate another QR for an extension.
        return bookingRepository.save(booking);
    }


    // --------------------------------------------------
    // 5. DUMMY PAYMENT (IF STILL USED BY YOUR FRONTEND)
    // --------------------------------------------------

    @Override
    @Transactional
    public Booking processDummyPayment(PaymentRequest request) {

        Booking booking = bookingRepository
                .findById(request.getBookingId())
                .orElseThrow(() -> new NoSuchElementException(
                        "No such booking: " + request.getBookingId()));

        if (booking.getStatus() != Booking.Status.HELD) {
            throw new IllegalStateException(
                    "This booking is not awaiting payment.");
        }

        if (booking.getScheduledStartAt() == null
                || booking.getScheduledEndAt() == null) {
            throw new IllegalStateException(
                    "The selected parking times are missing.");
        }

        BigDecimal amount = HOURLY_RATE.multiply(
                BigDecimal.valueOf(booking.getDurationHours()));

        booking.setAmount(amount);
        booking.setStatus(Booking.Status.CONFIRMED);

        Booking savedBooking = bookingRepository.save(booking);

        slotService.markOccupied(savedBooking.getSlotId());
        qrService.generateQr(savedBooking.getBookingId());

        return savedBooking;
    }
}
