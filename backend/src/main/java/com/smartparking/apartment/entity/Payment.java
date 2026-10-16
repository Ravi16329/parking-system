
package com.smartparking.apartment.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "payment")
public class Payment {
    public enum Status { CREATED, SUCCESS, FAILED }
    public enum Type { BOOKING, EXTENSION }
    @Id private String paymentId;
    private String bookingId;
    @Column(precision = 10, scale = 2) private BigDecimal amount;
    private String paymentMode;
    private LocalDateTime paymentTime;
    @Enumerated(EnumType.STRING) private Status status;
    private String transactionId;
    private String razorpayOrderId;
    @Enumerated(EnumType.STRING) private Type type = Type.BOOKING;
    private Integer extensionHours;

    public Payment() {}
    public Payment(String bookingId, BigDecimal amount, String paymentMode) {
        this.paymentId = UUID.randomUUID().toString(); this.bookingId = bookingId; this.amount = amount;
        this.paymentMode = paymentMode; this.paymentTime = LocalDateTime.now(); this.status = Status.CREATED;
        this.type = Type.BOOKING;
    }
    public String getPaymentId() { return paymentId; }
    public void setPaymentId(String paymentId) { this.paymentId = paymentId; }
    public String getBookingId() { return bookingId; }
    public void setBookingId(String bookingId) { this.bookingId = bookingId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getPaymentMode() { return paymentMode; }
    public void setPaymentMode(String paymentMode) { this.paymentMode = paymentMode; }
    public LocalDateTime getPaymentTime() { return paymentTime; }
    public void setPaymentTime(LocalDateTime paymentTime) { this.paymentTime = paymentTime; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
    public String getRazorpayOrderId() { return razorpayOrderId; }
    public void setRazorpayOrderId(String razorpayOrderId) { this.razorpayOrderId = razorpayOrderId; }
    public Type getType() { return type == null ? Type.BOOKING : type; }
    public void setType(Type type) { this.type = type; }
    public Integer getExtensionHours() { return extensionHours; }
    public void setExtensionHours(Integer extensionHours) { this.extensionHours = extensionHours; }
}
