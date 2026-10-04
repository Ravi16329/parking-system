package com.smartparking.apartment.service;

public interface OtpService {

    /**
     * Generates a code for the number and sends it. Returns the code only in dev
     * mode.
     */
    String sendOtp(String phone);

    /**
     * True when the code matches and has not expired; consumes the code on success.
     */
    boolean verifyOtp(String phone, String code);
}