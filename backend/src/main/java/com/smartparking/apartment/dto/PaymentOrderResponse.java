package com.smartparking.apartment.dto;

public class PaymentOrderResponse {

    private String orderId;
    private String keyId;
    private String bookingId;
    private int amount;
    private String currency;

    public PaymentOrderResponse() {
    }

    public PaymentOrderResponse(
            String orderId,
            String keyId,
            String bookingId,
            int amount,
            String currency) {

        this.orderId = orderId;
        this.keyId = keyId;
        this.bookingId = bookingId;
        this.amount = amount;
        this.currency = currency;
    }

    public String getOrderId() {
        return orderId;
    }

    public String getKeyId() {
        return keyId;
    }

    public String getBookingId() {
        return bookingId;
    }

    public int getAmount() {
        return amount;
    }

    public String getCurrency() {
        return currency;
    }
}