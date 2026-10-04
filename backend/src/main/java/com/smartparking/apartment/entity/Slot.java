package com.smartparking.apartment.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * A single fixed parking slot in the apartment (e.g. "A1").
 * Slots are fixed per building/floor and do not change often, so this
 * table is seeded once (see data.sql) rather than created dynamically.
 *
 * heldAt records when a slot was last marked HELD, so an expired hold
 * (older than app.slot.hold-minutes) can be released back to AVAILABLE
 * automatically, either lazily (on read) or by the scheduled sweep in
 * SlotServiceImpl.
 */
@Entity
@Table(name = "slot")
public class Slot {

    public enum Status {
        AVAILABLE,
        HELD,
        OCCUPIED
    }

    @Id
    private String id; // e.g. "A1", "A2" ... matches slots.json on the frontend

    @Enumerated(EnumType.STRING)
    private Status status;

    private Integer floor;

    private LocalDateTime heldAt; // null unless status == HELD

    public Slot() {
    }

    public Slot(String id, Status status, Integer floor) {
        this.id = id;
        this.status = status;
        this.floor = floor;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public Integer getFloor() {
        return floor;
    }

    public void setFloor(Integer floor) {
        this.floor = floor;
    }

    public LocalDateTime getHeldAt() {
        return heldAt;
    }

    public void setHeldAt(LocalDateTime heldAt) {
        this.heldAt = heldAt;
    }
}