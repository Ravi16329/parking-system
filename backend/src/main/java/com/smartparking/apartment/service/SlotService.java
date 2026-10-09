package com.smartparking.apartment.service;

import java.util.List;

import com.smartparking.apartment.entity.Booking;
import com.smartparking.apartment.entity.Slot;

public interface SlotService {
    List<Slot> getAllSlots();
    Slot holdSlot(String slotId);
    void releaseSlot(String slotId);
    void markOccupied(String slotId);
    void releaseOccupiedSlot(String slotId);
    Booking adminBookSlot(String slotId, String name, String phone);
}