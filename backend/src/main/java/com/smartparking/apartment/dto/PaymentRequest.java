package com.smartparking.apartment.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload sent from the (dummy) PaymentPage.
 */
public class PaymentRequest {

    @NotBlank
    private String bookingId;

    @NotBlank
    private String method; // "UPI" or "CARD"

    public String getBookingId() {
        return bookingId;
    }

    public void setBookingId(String bookingId) {
        this.bookingId = bookingId;
    }

    public String getMethod() {
        return method;
    }

    public void setMethod(String method) {
        this.method = method;
    }
}
