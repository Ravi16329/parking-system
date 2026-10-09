package com.smartparking.apartment.dto;

public class QrResponse {

    private String qrId;
    private String token;
    private String bookingId;
    private String status;

    public QrResponse() {
    }

    public QrResponse(
            String qrId,
            String token,
            String bookingId,
            String status) {

        this.qrId = qrId;
        this.token = token;
        this.bookingId = bookingId;
        this.status = status;
    }

    public String getQrId() {
        return qrId;
    }

    public String getToken() {
        return token;
    }

    public String getBookingId() {
        return bookingId;
    }

    public String getStatus() {
        return status;
    }
}