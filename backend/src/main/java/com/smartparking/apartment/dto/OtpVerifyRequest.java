package com.smartparking.apartment.dto;

import jakarta.validation.constraints.Pattern;

/** Body of POST /api/otp/verify */
public class OtpVerifyRequest {

    @Pattern(regexp = "^[6-9][0-9]{9}$", message = "Enter a valid 10-digit mobile number")
    private String phone;

    @Pattern(regexp = "^[0-9]{6}$", message = "The code is 6 digits")
    private String code;

    public OtpVerifyRequest() {
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }
}