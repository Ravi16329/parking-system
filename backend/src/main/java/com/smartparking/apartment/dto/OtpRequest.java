package com.smartparking.apartment.dto;

import jakarta.validation.constraints.Pattern;

/** Body of POST /api/otp/send */
public class OtpRequest {

    @Pattern(regexp = "^[6-9][0-9]{9}$", message = "Enter a valid 10-digit mobile number")
    private String phone;

    public OtpRequest() {
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }
}