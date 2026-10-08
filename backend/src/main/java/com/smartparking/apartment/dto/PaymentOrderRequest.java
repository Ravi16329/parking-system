package com.smartparking.apartment.dto;

import jakarta.validation.constraints.NotBlank;

public class PaymentOrderRequest {

    @NotBlank
    private String bookingId;

    public String getBookingId() {
        return bookingId;
    }

    public void setBookingId(String bookingId) {
        this.bookingId = bookingId;
    }
}