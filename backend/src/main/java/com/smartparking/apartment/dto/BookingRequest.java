package com.smartparking.apartment.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload sent from the BookingForm page when the user confirms a slot.
 */
public class BookingRequest {

    @NotBlank
    private String slotId;

    @NotBlank
    private String name;

    @NotBlank
    private String phone;

    public String getSlotId() {
        return slotId;
    }

    public void setSlotId(String slotId) {
        this.slotId = slotId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }
}
