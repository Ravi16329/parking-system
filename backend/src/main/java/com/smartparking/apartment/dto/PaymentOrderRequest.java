// package com.smartparking.apartment.dto;

// import jakarta.validation.constraints.NotBlank;

// public class PaymentOrderRequest {

//     @NotBlank
//     private String bookingId;

//     public String getBookingId() {
//         return bookingId;
//     }

//     public void setBookingId(String bookingId) {
//         this.bookingId = bookingId;
//     }
// }

package com.smartparking.apartment.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public class PaymentOrderRequest {
    @NotBlank private String bookingId;
    @Min(1) private Integer extraHours;
    public String getBookingId() { return bookingId; }
    public void setBookingId(String bookingId) { this.bookingId = bookingId; }
    public Integer getExtraHours() { return extraHours; }
    public void setExtraHours(Integer extraHours) { this.extraHours = extraHours; }
}
