// package com.smartparking.apartment.dto;

// import jakarta.validation.constraints.NotBlank;

// /**
//  * Payload sent from the BookingForm page when the user confirms a slot.
//  */
// public class BookingRequest {

//     @NotBlank
//     private String slotId;

//     @NotBlank
//     private String name;

//     @NotBlank
//     private String phone;

//     public String getSlotId() {
//         return slotId;
//     }

//     public void setSlotId(String slotId) {
//         this.slotId = slotId;
//     }

//     public String getName() {
//         return name;
//     }

//     public void setName(String name) {
//         this.name = name;
//     }

//     public String getPhone() {
//         return phone;
//     }

//     public void setPhone(String phone) {
//         this.phone = phone;
//     }
// }


package com.smartparking.apartment.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class BookingRequest {
    @NotBlank private String slotId;
    @NotBlank private String name;
    @NotBlank private String phone;
    @NotNull @Min(1) private Integer durationHours = 1;

    public String getSlotId() { return slotId; }
    public void setSlotId(String slotId) { this.slotId = slotId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public Integer getDurationHours() { return durationHours == null ? 1 : durationHours; }
    public void setDurationHours(Integer durationHours) { this.durationHours = durationHours; }
}
