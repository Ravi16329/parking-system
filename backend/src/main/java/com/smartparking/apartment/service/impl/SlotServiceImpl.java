package com.smartparking.apartment.service.impl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartparking.apartment.entity.Booking;
import com.smartparking.apartment.entity.Slot;
import com.smartparking.apartment.exception.SlotUnavailableException;
import com.smartparking.apartment.repository.BookingRepository;
import com.smartparking.apartment.repository.SlotRepository;
import com.smartparking.apartment.service.SlotService;

@Service
public class SlotServiceImpl implements SlotService {

    @Autowired
    private SlotRepository slotRepository;

    @Autowired
private BookingRepository bookingRepository;

    /** How long a HELD slot stays reserved before it's released automatically. */
    @Value("${app.slot.hold-minutes:3}")
    private long holdMinutes;

    private LocalDateTime cutoffNow() {
        return LocalDateTime.now().minusMinutes(holdMinutes);
    }

    @Override
    @Transactional
    public List<Slot> getAllSlots() {
        slotRepository.releaseExpiredHolds(Slot.Status.HELD, Slot.Status.AVAILABLE, cutoffNow());
        return slotRepository.findAll();
    }

    @Override
    @Transactional
    public Slot holdSlot(String slotId) {
        // Release anything that's timed out first, in case this exact slot
        // is the one expiring right now.
        slotRepository.releaseExpiredHolds(Slot.Status.HELD, Slot.Status.AVAILABLE, cutoffNow());

        int updated = slotRepository.tryHold(slotId, Slot.Status.HELD, Slot.Status.AVAILABLE, LocalDateTime.now());
        if (updated == 0) {
            Slot existing = slotRepository.findById(slotId)
                    .orElseThrow(() -> new NoSuchElementException("No such slot: " + slotId));
            throw new SlotUnavailableException(
                    "Slot " + slotId + " is currently " + existing.getStatus().name().toLowerCase());
        }

        return slotRepository.findById(slotId)
                .orElseThrow(() -> new NoSuchElementException("No such slot: " + slotId));
    }

    @Override
    @Transactional
    public void releaseSlot(String slotId) {
        Slot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new NoSuchElementException("No such slot: " + slotId));
        slot.setStatus(Slot.Status.AVAILABLE);
        slot.setHeldAt(null);
        slotRepository.save(slot);
    }

    @Override
    @Transactional
    public void markOccupied(String slotId) {
        Slot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new NoSuchElementException("No such slot: " + slotId));
        slot.setStatus(Slot.Status.OCCUPIED);
        slot.setHeldAt(null);
        slotRepository.save(slot);
    }

    @Override
@Transactional
public Booking adminBookSlot(String slotId, String name, String phone) {
    slotRepository.releaseExpiredHolds(Slot.Status.HELD, Slot.Status.AVAILABLE, cutoffNow());

    // Same atomic claim the online flow uses, so the admin can't take a bay
    // a resident is midway through booking.
    int claimed = slotRepository.tryHold(slotId, Slot.Status.HELD, Slot.Status.AVAILABLE, LocalDateTime.now());
    if (claimed == 0) {
        Slot existing = slotRepository.findById(slotId)
                .orElseThrow(() -> new NoSuchElementException("No such slot: " + slotId));
        throw new SlotUnavailableException(
                "Slot " + slotId + " is currently " + existing.getStatus().name().toLowerCase());
    }

    Slot slot = slotRepository.findById(slotId)
            .orElseThrow(() -> new NoSuchElementException("No such slot: " + slotId));
    slot.setStatus(Slot.Status.OCCUPIED);
    slot.setHeldAt(null); // so the hold sweeper never frees a paid bay
    slotRepository.save(slot);

    Booking booking = new Booking();
    booking.setBookingId("BK" + Long.toString(System.currentTimeMillis(), 36).toUpperCase());
    booking.setSlotId(slotId);
    booking.setName(name);
    booking.setPhone(phone);
    booking.setStatus(Booking.Status.CONFIRMED);
    booking.setCreatedAt(LocalDateTime.now());
    return bookingRepository.save(booking);
}
}