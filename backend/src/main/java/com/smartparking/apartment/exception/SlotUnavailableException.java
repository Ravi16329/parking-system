package com.smartparking.apartment.exception;

/** Thrown when a slot can't be held because it's already HELD or OCCUPIED. */
public class SlotUnavailableException extends RuntimeException {
    public SlotUnavailableException(String message) {
        super(message);
    }
}