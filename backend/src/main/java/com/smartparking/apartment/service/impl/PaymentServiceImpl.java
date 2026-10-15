// package com.smartparking.apartment.service.impl;

// import java.math.BigDecimal;
// import java.util.NoSuchElementException;

// import org.json.JSONObject;
// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.beans.factory.annotation.Value;
// import org.springframework.stereotype.Service;
// import org.springframework.transaction.annotation.Transactional;

// import com.razorpay.Order;
// import com.razorpay.RazorpayClient;
// import com.razorpay.Utils;
// import com.smartparking.apartment.dto.PaymentOrderRequest;
// import com.smartparking.apartment.dto.PaymentOrderResponse;
// import com.smartparking.apartment.dto.PaymentRequest;
// import com.smartparking.apartment.dto.PaymentVerifyRequest;
// import com.smartparking.apartment.entity.Booking;
// import com.smartparking.apartment.entity.Payment;
// import com.smartparking.apartment.repository.BookingRepository;
// import com.smartparking.apartment.repository.PaymentRepository;
// import com.smartparking.apartment.service.PaymentService;
// import com.smartparking.apartment.service.QrService;
// import com.smartparking.apartment.service.SlotService;

// @Service
// public class PaymentServiceImpl implements PaymentService {

//     @Autowired
//     private BookingRepository bookingRepository;

//     @Autowired
//     private PaymentRepository paymentRepository;

//     @Autowired
//     private SlotService slotService;

//     @Autowired
//     private RazorpayClient razorpayClient;

//     @Autowired
// private QrService qrService;

//     @Value("${razorpay.key.id}")
//     private String razorpayKeyId;

//     @Value("${razorpay.key.secret}")
// private String razorpayKeySecret;

//     // ₹50 parking fee
//     private static final int AMOUNT_IN_PAISE = 5000;

//     @Override
//     @Transactional
//     public PaymentOrderResponse createOrder(PaymentOrderRequest request) {

//         Booking booking = bookingRepository.findById(request.getBookingId())
//                 .orElseThrow(() ->
//                         new NoSuchElementException(
//                                 "No such booking: " + request.getBookingId()));

//         try {
//             // Razorpay amount is in paise
//             JSONObject orderRequest = new JSONObject();

//             orderRequest.put("amount", AMOUNT_IN_PAISE);
//             orderRequest.put("currency", "INR");
//             orderRequest.put("receipt", booking.getBookingId());

//             Order razorpayOrder = razorpayClient.orders.create(orderRequest);

//             String razorpayOrderId = razorpayOrder.get("id");

//             // Save payment record in PostgreSQL
//             Payment payment = new Payment(
//                     booking.getBookingId(),
//                     BigDecimal.valueOf(50),
//                     "RAZORPAY"
//             );

//             payment.setRazorpayOrderId(razorpayOrderId);
//             payment.setStatus(Payment.Status.CREATED);

//             paymentRepository.save(payment);

//             return new PaymentOrderResponse(
//                     razorpayOrderId,
//                     razorpayKeyId,
//                     booking.getBookingId(),
//                     AMOUNT_IN_PAISE,
//                     "INR"
//             );

//         } catch (Exception e) {
//             throw new RuntimeException(
//                     "Failed to create Razorpay order: " + e.getMessage(), e);
//         }
//     }

// @Override
// @Transactional
// public Booking verifyPayment(PaymentVerifyRequest request) {

//     // 1. Find booking
//     Booking booking = bookingRepository.findById(request.getBookingId())
//             .orElseThrow(() -> new NoSuchElementException(
//                     "No such booking: " + request.getBookingId()));

//     // 2. Find payment using the ORDER ID sent by Razorpay
//     Payment payment = paymentRepository
//             .findByRazorpayOrderId(request.getRazorpayOrderId())
//             .orElseThrow(() -> new NoSuchElementException(
//                     "No payment found for Razorpay order: "
//                             + request.getRazorpayOrderId()));

//     // 3. Make sure payment belongs to this booking
//     if (!payment.getBookingId().equals(booking.getBookingId())) {
//         throw new IllegalArgumentException(
//                 "Payment does not belong to this booking");
//     }

//     // 4. IMPORTANT:
//     // Use the order ID stored in our database for verification.
//     String trustedOrderId = payment.getRazorpayOrderId();

//     // 5. Verify Razorpay signature
//     try {

//         JSONObject attributes = new JSONObject();

//         attributes.put(
//                 "razorpay_order_id",
//                 trustedOrderId
//         );

//         attributes.put(
//                 "razorpay_payment_id",
//                 request.getRazorpayPaymentId()
//         );

//         attributes.put(
//                 "razorpay_signature",
//                 request.getRazorpaySignature()
//         );

//         Utils.verifyPaymentSignature(
//                 attributes,
//                 razorpayKeySecret
//         );

//     } catch (Exception e) {

//         System.out.println(
//                 "Razorpay signature verification failed: "
//                         + e.getMessage()
//         );

//         payment.setStatus(Payment.Status.FAILED);
//         paymentRepository.save(payment);

//         throw new IllegalArgumentException(
//                 "Invalid Razorpay payment signature"
//         );
//     }

//     // 6. Payment successful
//     payment.setStatus(Payment.Status.SUCCESS);

//     payment.setTransactionId(
//             request.getRazorpayPaymentId()
//     );

//     payment.setPaymentTime(
//             java.time.LocalDateTime.now()
//     );

//     paymentRepository.save(payment);

//     // 7. Confirm booking
// booking.setStatus(Booking.Status.CONFIRMED);
// bookingRepository.save(booking);

// // 8. Occupy slot
// slotService.markOccupied(
//         booking.getSlotId()
// );

// // 9. Generate QR after successful payment
// qrService.generateQr(
//         booking.getBookingId()
// );

// return booking;
// }

//     @Override
//     @Transactional
//     public Booking processDummyPayment(PaymentRequest request) {

//         Booking booking = bookingRepository.findById(request.getBookingId())
//                 .orElseThrow(() ->
//                         new NoSuchElementException(
//                                 "No such booking: " + request.getBookingId()));

//         // Dummy payment remains temporarily.
//         booking.setStatus(Booking.Status.CONFIRMED);
//         bookingRepository.save(booking);

//         slotService.markOccupied(booking.getSlotId());

//         return booking;
//     }
// }


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
import com.smartparking.apartment.dto.*;
import com.smartparking.apartment.entity.Booking;
import com.smartparking.apartment.entity.Payment;
import com.smartparking.apartment.repository.BookingRepository;
import com.smartparking.apartment.repository.PaymentRepository;
import com.smartparking.apartment.repository.ParkingQrRepository;
import com.smartparking.apartment.entity.ParkingQr;
import com.smartparking.apartment.service.PaymentService;
import com.smartparking.apartment.service.QrService;
import com.smartparking.apartment.service.SlotService;

@Service
public class PaymentServiceImpl implements PaymentService {
    private static final BigDecimal HOURLY_RATE = BigDecimal.valueOf(50);
    private static final int PAISE_PER_RUPEE = 100;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private ParkingQrRepository parkingQrRepository;
    @Autowired private SlotService slotService;
    @Autowired private RazorpayClient razorpayClient;
    @Autowired private QrService qrService;
    @Value("${razorpay.key.id}") private String razorpayKeyId;
    @Value("${razorpay.key.secret}") private String razorpayKeySecret;

    @Override @Transactional
    public PaymentOrderResponse createOrder(PaymentOrderRequest request) {
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new NoSuchElementException("No such booking: " + request.getBookingId()));
        if (booking.getStatus() != Booking.Status.HELD) {
            throw new IllegalStateException("This booking is not awaiting its initial payment");
        }
        BigDecimal amount = HOURLY_RATE.multiply(BigDecimal.valueOf(booking.getDurationHours()));
        return createRazorpayOrder(booking, amount, Payment.Type.BOOKING, null);
    }

    @Override @Transactional
    public PaymentOrderResponse createExtensionOrder(PaymentOrderRequest request) {
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new NoSuchElementException("No such booking: " + request.getBookingId()));
        int extraHours = request.getExtraHours() == null ? 0 : request.getExtraHours();
        if (extraHours < 1) throw new IllegalArgumentException("Select at least one extra hour");
        if (booking.getStatus() != Booking.Status.CONFIRMED) {
            throw new IllegalStateException("Only confirmed bookings can be extended");
        }
        ParkingQr qr = parkingQrRepository.findByBookingId(booking.getBookingId()).orElse(null);
        if (qr == null || (qr.getStatus() != ParkingQr.Status.ACTIVE && qr.getStatus() != ParkingQr.Status.PARKED)) {
            throw new IllegalStateException("This booking can no longer be extended because its parking QR is no longer active");
        }
        BigDecimal amount = HOURLY_RATE.multiply(BigDecimal.valueOf(extraHours));
        return createRazorpayOrder(booking, amount, Payment.Type.EXTENSION, extraHours);
    }

    private PaymentOrderResponse createRazorpayOrder(Booking booking, BigDecimal amount, Payment.Type type, Integer extraHours) {
        try {
            int amountPaise = amount.multiply(BigDecimal.valueOf(PAISE_PER_RUPEE)).intValueExact();
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", booking.getBookingId() + (type == Payment.Type.EXTENSION ? "-EXT-" + System.nanoTime() : ""));
            Order razorpayOrder = razorpayClient.orders.create(orderRequest);
            String orderId = razorpayOrder.get("id");
            Payment payment = new Payment(booking.getBookingId(), amount, "RAZORPAY");
            payment.setRazorpayOrderId(orderId);
            payment.setStatus(Payment.Status.CREATED);
            payment.setType(type);
            payment.setExtensionHours(extraHours);
            paymentRepository.save(payment);
            return new PaymentOrderResponse(orderId, razorpayKeyId, booking.getBookingId(), amountPaise, "INR");
        } catch (Exception e) {
            throw new RuntimeException("Failed to create Razorpay order: " + e.getMessage(), e);
        }
    }

    @Override @Transactional
    public Booking verifyPayment(PaymentVerifyRequest request) {
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new NoSuchElementException("No such booking: " + request.getBookingId()));
        Payment payment = paymentRepository.findByRazorpayOrderId(request.getRazorpayOrderId())
                .orElseThrow(() -> new NoSuchElementException("No payment found for Razorpay order: " + request.getRazorpayOrderId()));
        if (!payment.getBookingId().equals(booking.getBookingId())) throw new IllegalArgumentException("Payment does not belong to this booking");
        if (payment.getStatus() == Payment.Status.SUCCESS) return booking; // idempotent; never extend twice
        try {
            JSONObject attributes = new JSONObject();
            attributes.put("razorpay_order_id", payment.getRazorpayOrderId());
            attributes.put("razorpay_payment_id", request.getRazorpayPaymentId());
            attributes.put("razorpay_signature", request.getRazorpaySignature());
            Utils.verifyPaymentSignature(attributes, razorpayKeySecret);
        } catch (Exception e) {
            payment.setStatus(Payment.Status.FAILED);
            paymentRepository.save(payment);
            throw new IllegalArgumentException("Invalid Razorpay payment signature");
        }

        payment.setStatus(Payment.Status.SUCCESS);
        payment.setTransactionId(request.getRazorpayPaymentId());
        payment.setPaymentTime(LocalDateTime.now());
        paymentRepository.save(payment);

        if (payment.getType() == Payment.Type.EXTENSION) {
            if (booking.getStatus() != Booking.Status.CONFIRMED) throw new IllegalStateException("Only confirmed bookings can be extended");
            int extraHours = payment.getExtensionHours() == null ? 0 : payment.getExtensionHours();
            if (extraHours < 1) throw new IllegalStateException("Extension duration is missing");
            LocalDateTime base = booking.getScheduledEndAt();
            LocalDateTime now = LocalDateTime.now();
            if (base == null || base.isBefore(now)) base = now;
            booking.setScheduledEndAt(base.plusHours(extraHours));
            booking.setDurationHours(booking.getDurationHours() + extraHours);
            booking.setAmount(booking.getAmount().add(payment.getAmount()));
            return bookingRepository.save(booking);
        }

        booking.setStatus(Booking.Status.CONFIRMED);
        booking.setAmount(payment.getAmount());
        booking.setScheduledEndAt(LocalDateTime.now().plusHours(booking.getDurationHours()));
        bookingRepository.save(booking);
        slotService.markOccupied(booking.getSlotId());
        qrService.generateQr(booking.getBookingId());
        return booking;
    }

    @Override @Transactional
    public Booking processDummyPayment(PaymentRequest request) {
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new NoSuchElementException("No such booking: " + request.getBookingId()));
        booking.setStatus(Booking.Status.CONFIRMED);
        booking.setScheduledEndAt(LocalDateTime.now().plusHours(booking.getDurationHours()));
        booking.setAmount(HOURLY_RATE.multiply(BigDecimal.valueOf(booking.getDurationHours())));
        bookingRepository.save(booking);
        slotService.markOccupied(booking.getSlotId());
        qrService.generateQr(booking.getBookingId());
        return booking;
    }
}
