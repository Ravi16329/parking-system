package com.smartparking.apartment.service;

import java.util.List;

import com.smartparking.apartment.entity.Booking;
import com.smartparking.apartment.entity.Slot;

public interface SlotService {

    /**
     * Returns all slots with their current status. Expired holds are
     * released back to AVAILABLE before the list is returned, so a caller
     * never sees a hold that's actually stale.
     */
    List<Slot> getAllSlots();

    /**
     * Marks a slot HELD so no other user can pick it while this user
     * completes the booking form. Auto-releases after
     * app.slot.hold-minutes (also swept in the background — see
     * SlotHoldSweeper).
     *
     * @throws com.smartparking.apartment.exception.SlotUnavailableException
     *                                                                       if the
     *                                                                       slot is
     *                                                                       already
     *                                                                       HELD or
     *                                                                       OCCUPIED
     *                                                                       by
     *                                                                       someone
     *                                                                       else.
     */
    Slot holdSlot(String slotId);

    /**
     * Releases a held slot back to AVAILABLE (timeout, or user cancels payment).
     */
    void releaseSlot(String slotId);

    /** Marks a slot OCCUPIED once payment/booking is confirmed. */
    void markOccupied(String slotId);

    Booking adminBookSlot(String slotId, String name, String phone);
}