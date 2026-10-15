// package com.smartparking.apartment.entity;

// import jakarta.persistence.*;

// import java.time.LocalDateTime;

// /**
//  * A booking created once a user submits the booking form for a held slot.
//  */
// @Entity
// @Table(name = "booking")
// public class Booking {

//     public enum Status {
//         HELD,
//         PAID,
//         CONFIRMED,
//         CANCELLED
//     }

//     @Id
//     private String bookingId; // e.g. "BK1023"

//     private String slotId;

//     private String name;

//     private String phone;

//     @Enumerated(EnumType.STRING)
//     private Status status;

//     private LocalDateTime createdAt;

//     public Booking() {
//     }

//     public Booking(String bookingId, String slotId, String name, String phone,
//                     Status status, LocalDateTime createdAt) {
//         this.bookingId = bookingId;
//         this.slotId = slotId;
//         this.name = name;
//         this.phone = phone;
//         this.status = status;
//         this.createdAt = createdAt;
//     }

//     public String getBookingId() {
//         return bookingId;
//     }

//     public void setBookingId(String bookingId) {
//         this.bookingId = bookingId;
//     }

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

//     public Status getStatus() {
//         return status;
//     }

//     public void setStatus(Status status) {
//         this.status = status;
//     }

//     public LocalDateTime getCreatedAt() {
//         return createdAt;
//     }

//     public void setCreatedAt(LocalDateTime createdAt) {
//         this.createdAt = createdAt;
//     }
// }

package com.smartparking.apartment.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "booking")
public class Booking {
    public enum Status { HELD, PAID, CONFIRMED, CANCELLED }

    @Id
    private String bookingId;
    private String slotId;
    private String name;
    private String phone;
    @Enumerated(EnumType.STRING)
    private Status status;
    private LocalDateTime createdAt;
    @Column(nullable = false)
    private Integer durationHours = 1;
    @Column(precision = 10, scale = 2)
    private BigDecimal amount = BigDecimal.valueOf(50);
    private LocalDateTime scheduledEndAt;

    public Booking() {}
    public Booking(String bookingId, String slotId, String name, String phone, Status status, LocalDateTime createdAt) {
        this.bookingId = bookingId; this.slotId = slotId; this.name = name; this.phone = phone;
        this.status = status; this.createdAt = createdAt;
    }
    public String getBookingId() { return bookingId; }
    public void setBookingId(String bookingId) { this.bookingId = bookingId; }
    public String getSlotId() { return slotId; }
    public void setSlotId(String slotId) { this.slotId = slotId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public Integer getDurationHours() { return durationHours == null ? 1 : durationHours; }
    public void setDurationHours(Integer durationHours) { this.durationHours = durationHours; }
    public BigDecimal getAmount() { return amount == null ? BigDecimal.ZERO : amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public LocalDateTime getScheduledEndAt() { return scheduledEndAt; }
    public void setScheduledEndAt(LocalDateTime scheduledEndAt) { this.scheduledEndAt = scheduledEndAt; }
}

